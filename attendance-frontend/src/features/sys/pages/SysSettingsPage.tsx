import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Loader2, Save, Mail, Server, Eye, EyeOff, ToggleLeft, ToggleRight, CreditCard, Settings2, FileText, Shield, ExternalLink, Copy, Check, Headset } from 'lucide-react'
import { sysSettingsService, type SystemSettings } from '../sysService'
import { copyText } from '@/utils/clipboard'
import { createTour } from '@/utils/tour'
import HelpButton from '@/components/HelpButton'

const PROVIDERS = [
  { label: 'Gmail',           host: 'smtp.gmail.com',        port: 587, ssl: true },
  { label: 'Outlook/Hotmail', host: 'smtp-mail.outlook.com', port: 587, ssl: true },
  { label: 'Yahoo Mail',      host: 'smtp.mail.yahoo.com',   port: 587, ssl: true },
  { label: 'Office 365',      host: 'smtp.office365.com',    port: 587, ssl: true },
  { label: 'Zoho Mail',       host: 'smtp.zoho.com',         port: 587, ssl: true },
  { label: 'Personalizado',   host: '',                       port: 587, ssl: true },
]

const REMINDER_DAY_OPTIONS = [1, 2, 3, 5, 7, 10, 14, 15, 20, 30]

const EMPTY: SystemSettings = {
  smtpEnabled: false, smtpHost: null, smtpPort: 587,
  smtpUsername: null, smtpPassword: null,
  smtpFromName: null, smtpFromEmail: null, smtpEnableSsl: true,
  gracePeriodDays: 3,
  expiryReminderEnabled: false,
  expiryReminderTarget: 'admin',
  expiryReminderDays: '[1,2,7,15,30]',
  requireApproval: false,
  termsOfUse: null,
  privacyPolicy: null,
  supportWhatsapp: null,
  supportEmail: null,
}

function Field({ label, value, onChange, placeholder, type = 'text', hint }: {
  label: string; value: string | number; onChange: (v: string) => void
  placeholder?: string; type?: string; hint?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-500">{label}</label>
      <input type={type} value={value ?? ''} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  )
}

function PasswordField({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-500">{label}</label>
      <div className="relative">
        <input type={show ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} autoComplete="new-password"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
        <button type="button" onClick={() => setShow(s => !s)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 z-10 p-1 text-gray-400 hover:text-gray-600">
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}

type Tab = 'general' | 'email' | 'billing'

export default function SysSettingsPage() {
  const [form,    setForm]    = useState<SystemSettings>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('general')
  const [copied,  setCopied]  = useState(false)

  const signUpUrl = `${window.location.origin}/sign-up`

  const handleCopy = async () => {
    await copyText(signUpUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  useEffect(() => {
    const BASE_URL = import.meta.env.VITE_API_URL ?? ''
    Promise.all([
      sysSettingsService.get(),
      import('axios').then(m => m.default.get(`${BASE_URL}/api/v1/public/legal`).then(r => r.data?.data)),
    ])
      .then(([settings, legal]) => {
        setForm({
          ...settings,
          termsOfUse:    settings.termsOfUse    ?? legal?.termsOfUse    ?? null,
          privacyPolicy: settings.privacyPolicy ?? legal?.privacyPolicy ?? null,
        })
      })
      .catch(() => toast.error('Error al cargar la configuración.'))
      .finally(() => setLoading(false))
  }, [])

  const applyProvider = (host: string, port: number, ssl: boolean) => {
    setForm(p => ({ ...p, smtpHost: host, smtpPort: port, smtpEnableSsl: ssl }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const saved = await sysSettingsService.update(form)
      setForm(f => ({ ...f, smtpPassword: form.smtpPassword }))
      void saved
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      toast.success('Configuración guardada correctamente.')
    } catch { toast.error('Error al guardar.') }
    finally { setSaving(false) }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Cargando…
      </div>
    )
  }

  function runTour() {
    createTour([
      { element: '#tour-cfg-header',           title: 'Configuración del sistema',      description: 'Ajustes globales que afectan a todo el sistema. Los cambios se aplican al presionar Guardar.' },
      { element: '#tour-cfg-tab-general',      title: 'Tab: General',                   description: 'Configuración general del sistema: registro de empresas y documentos legales.', onHighlight: () => setActiveTab('general') },
      { element: '#tour-cfg-content-general',  title: 'Registro, soporte y documentos',  description: 'Izquierda: URL pública de registro, aprobación manual y datos de contacto de soporte (WhatsApp y email) que verán las empresas en su página /support. Derecha: edita los Términos de uso y la Política de privacidad que los usuarios leen al registrarse.', onHighlight: () => setActiveTab('general') },
      { element: '#tour-cfg-tab-email',        title: 'Tab: Configuración de correo',   description: 'Configura el servidor SMTP que el sistema usa para enviar correos a las empresas: aprobaciones, vencimientos y notificaciones.', onHighlight: () => setActiveTab('email') },
      { element: '#tour-cfg-content-email',    title: 'Ajustes SMTP',                   description: 'Activa o desactiva el envío de correos, selecciona el proveedor (Gmail, Outlook, etc.), ingresa el servidor, puerto, usuario y contraseña. Guarda los cambios para que surtan efecto.', onHighlight: () => setActiveTab('email') },
      { element: '#tour-cfg-tab-billing',      title: 'Tab: Suscripciones',             description: 'Configura cómo el sistema maneja el vencimiento de suscripciones: días de gracia y recordatorios automáticos por correo.', onHighlight: () => setActiveTab('billing') },
      { element: '#tour-cfg-content-billing',  title: 'Ajustes de facturación',         description: 'Define cuántos días de gracia tienen las empresas tras vencer su suscripción, y configura recordatorios automáticos para notificarles antes o después del vencimiento.', onHighlight: () => setActiveTab('billing') },
      { element: '#tour-cfg-save',             title: 'Guardar cambios',                description: 'Aplica todos los cambios de todas las secciones. Asegúrate de guardar antes de salir de la página.' },
    ]).drive()
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div id="tour-cfg-header" className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
          <p className="text-gray-500 text-sm mt-0.5">Ajustes generales del sistema</p>
          <div className="mt-1"><HelpButton onClick={runTour} /></div>
        </div>
        <button id="tour-cfg-save" onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-5 py-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors">
          {saving
            ? <><Loader2 className="w-4 h-4 animate-spin" />Guardando…</>
            : saved
            ? <><Save className="w-4 h-4" />¡Guardado!</>
            : <><Save className="w-4 h-4" />Guardar</>}
        </button>
      </div>

      {/* Tabs container */}
      <div id="tour-cfg-tabs" className="bg-white rounded-xl border border-gray-200" style={{ overflow: 'clip' }}>
        <div className="flex border-b border-gray-200">
          {([
            { key: 'general', label: 'General',                  Icon: Settings2,  tourId: 'tour-cfg-tab-general' },
            { key: 'email',   label: 'Configuración de correo',  Icon: Server,     tourId: 'tour-cfg-tab-email'   },
            { key: 'billing', label: 'Suscripciones',            Icon: CreditCard, tourId: 'tour-cfg-tab-billing' },
          ] as { key: Tab; label: string; Icon: React.ElementType; tourId: string }[]).map(({ key, label, Icon, tourId }) => (
            <button key={key} id={tourId} onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-6 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === key
                  ? 'border-slate-800 text-slate-800 bg-slate-50/50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}>
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="p-6">

          {/* ── Tab: General ────────────────────────────────────────────── */}
          {activeTab === 'general' && (
            <div id="tour-cfg-content-general" className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start gap-y-8">

              {/* ── Columna izquierda: Registro ────────────────────────────── */}
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-gray-800 mb-1">Registro de empresas</p>
                  <p className="text-xs text-gray-400 mb-4">
                    Controla cómo se incorporan las nuevas empresas registradas desde la página pública.
                  </p>
                </div>
                {/* URL pública de registro */}
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
                <span className="text-xs text-gray-500 truncate flex-1 font-mono">{signUpUrl}</span>
                <a href={signUpUrl} target="_blank" rel="noopener noreferrer"
                  className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-white rounded-lg transition-colors shrink-0" title="Abrir página">
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button onClick={handleCopy}
                  className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-white rounded-lg transition-colors shrink-0" title="Copiar URL">
                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex items-start justify-between gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div>
                    <p className="text-sm font-medium text-gray-800">Requerir aprobación manual</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Si está activado, las empresas que se registren desde <span className="font-medium">/sign-up</span> quedarán
                      pendientes hasta que el superadmin las apruebe manualmente desde la sección Empresas.
                    </p>
                  </div>
                  <button
                    onClick={() => setForm(p => ({ ...p, requireApproval: !p.requireApproval }))}
                    className={`flex items-center gap-1.5 text-sm font-medium shrink-0 transition-colors ${form.requireApproval ? 'text-slate-700' : 'text-gray-400'}`}>
                    {form.requireApproval
                      ? <ToggleRight className="w-8 h-8" />
                      : <ToggleLeft  className="w-8 h-8" />}
                    {form.requireApproval ? 'Activado' : 'Desactivado'}
                  </button>
                </div>
                {form.requireApproval && (
                  <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 space-y-1">
                    <p className="font-medium">Con esta opción activada:</p>
                    <ul className="list-disc list-inside space-y-0.5 text-amber-700">
                      <li>Las nuevas empresas de <strong>/sign-up</strong> no podrán iniciar sesión hasta ser aprobadas.</li>
                      <li>Recibirás una notificación por cada empresa registrada.</li>
                      <li>Si desactivas esta opción, todas las empresas pendientes serán aprobadas automáticamente.</li>
                    </ul>
                  </div>
                )}
              </div>

              {/* ── Soporte ───────────────────────────────────────────────── */}
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800 mb-1">Contacto de soporte</p>
                  <p className="text-xs text-gray-400">
                    Datos visibles para las empresas en su página de soporte.
                  </p>
                </div>
                <Field label="WhatsApp (con código país)" value={form.supportWhatsapp ?? ''}
                  onChange={v => setForm(p => ({ ...p, supportWhatsapp: v || null }))}
                  placeholder="+593999999999" />
                <Field label="Email de contacto de soporte" value={form.supportEmail ?? ''}
                  onChange={v => setForm(p => ({ ...p, supportEmail: v || null }))}
                  placeholder="soporte@empresa.com" />

                <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-600 space-y-2">
                  <p className="font-medium text-gray-700 flex items-center gap-1.5">
                    <Headset className="w-3.5 h-3.5 text-gray-400" /> ¿Cómo funciona?
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-gray-500">
                    <li>
                      <span className="font-medium text-gray-700">WhatsApp y email</span> se muestran a las empresas en su
                      página de soporte como canales de contacto directo.
                    </li>
                    <li>
                      <span className="font-medium text-gray-700">Email de contacto</span> recibe una notificación por correo
                      cada vez que una empresa crea un nuevo ticket de soporte
                      {form.smtpEnabled
                        ? ' (SMTP activo ✓).'
                        : ' (requiere activar el SMTP en la pestaña "Configuración de correo").'}
                    </li>
                    <li>
                      Las empresas también pueden escribir a este email directamente si no tienen plan de soporte preferencial.
                    </li>
                  </ul>
                </div>
              </div>

              {/* ── Documentos legales (full width) ───────────────────────── */}
              <div className="space-y-5 lg:col-span-2">
                <div>
                  <p className="text-sm font-semibold text-gray-800 mb-1">Documentos legales</p>
                  <p className="text-xs text-gray-400">
                    Texto que se muestra en las páginas <strong>/terms</strong> y <strong>/privacy</strong> accesibles desde el registro.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                        <FileText className="w-4 h-4 text-gray-400" /> Términos de uso
                      </label>
                      <a href="/terms" target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-primary-600 hover:underline font-medium">
                        <ExternalLink className="w-3.5 h-3.5" /> Ver página
                      </a>
                    </div>
                    <textarea
                      rows={12}
                      value={form.termsOfUse ?? ''}
                      onChange={e => setForm(p => ({ ...p, termsOfUse: e.target.value || null }))}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-500 resize-y"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                        <Shield className="w-4 h-4 text-gray-400" /> Política de privacidad
                      </label>
                      <a href="/privacy" target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-primary-600 hover:underline font-medium">
                        <ExternalLink className="w-3.5 h-3.5" /> Ver página
                      </a>
                    </div>
                    <textarea
                      rows={12}
                      value={form.privacyPolicy ?? ''}
                      onChange={e => setForm(p => ({ ...p, privacyPolicy: e.target.value || null }))}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-500 resize-y"
                    />
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ── Tab: Correo ─────────────────────────────────────────────── */}
          {activeTab === 'email' && (
            <div id="tour-cfg-content-email" className="space-y-5">

              {/* Toggle habilitado */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div>
                  <p className="text-sm font-medium text-gray-800">Envío de correos activo</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Si está desactivado el sistema no enviará ningún correo
                  </p>
                </div>
                <button onClick={() => setForm(p => ({ ...p, smtpEnabled: !p.smtpEnabled }))}
                  className={`flex items-center gap-1.5 text-sm font-medium ${form.smtpEnabled ? 'text-slate-700' : 'text-gray-400'}`}>
                  {form.smtpEnabled
                    ? <ToggleRight className="w-8 h-8" />
                    : <ToggleLeft  className="w-8 h-8" />}
                  {form.smtpEnabled ? 'Activado' : 'Desactivado'}
                </button>
              </div>

              {/* Selector de proveedor */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">Proveedor</label>
                <div className="flex flex-wrap gap-2">
                  {PROVIDERS.map(p => (
                    <button key={p.label} onClick={() => applyProvider(p.host, p.port, p.ssl)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                        form.smtpHost === p.host && p.host !== ''
                          ? 'bg-slate-800 text-white border-slate-800'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-slate-400 hover:text-slate-700'
                      }`}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Campos en grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <Field label="Servidor SMTP" value={form.smtpHost ?? ''} onChange={v => setForm(p => ({ ...p, smtpHost: v }))}
                    placeholder="smtp.gmail.com" />
                </div>
                <Field label="Puerto" value={form.smtpPort} onChange={v => setForm(p => ({ ...p, smtpPort: parseInt(v) || 587 }))}
                  type="number" placeholder="587" />
                <Field label="Usuario / Email remitente" value={form.smtpUsername ?? ''} onChange={v => setForm(p => ({ ...p, smtpUsername: v }))}
                  placeholder="no-reply@empresa.com" />
                <PasswordField label="Contraseña / App Password" value={form.smtpPassword ?? ''}
                  onChange={v => setForm(p => ({ ...p, smtpPassword: v }))} placeholder="Contraseña o App Password" />
                <Field label="Nombre del remitente" value={form.smtpFromName ?? ''} onChange={v => setForm(p => ({ ...p, smtpFromName: v }))}
                  placeholder="AssistControl" />
              </div>

              {/* SSL checkbox */}
              <div className="flex items-center gap-3">
                <input type="checkbox" id="ssl" checked={form.smtpEnableSsl}
                  onChange={e => setForm(p => ({ ...p, smtpEnableSsl: e.target.checked }))}
                  className="w-4 h-4 rounded accent-slate-700" />
                <label htmlFor="ssl" className="text-sm text-gray-700">Usar SSL/TLS</label>
              </div>

              {/* Notas por proveedor */}
              {form.smtpHost === 'smtp.gmail.com' && (
                <div className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 space-y-1">
                  <p className="font-medium flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Gmail — Contraseña de aplicación</p>
                  <p>Gmail requiere una <strong>contraseña de aplicación</strong> (no tu contraseña normal).
                    Actívala en <strong>Mi Cuenta → Seguridad → Contraseñas de aplicación</strong>.
                    La verificación en dos pasos debe estar habilitada.</p>
                </div>
              )}
              {form.smtpHost === 'smtp-mail.outlook.com' && (
                <div className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
                  <p className="font-medium flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Outlook/Hotmail</p>
                  <p>Usa tu email completo como usuario (ej: tucorreo@hotmail.com) y tu contraseña normal.</p>
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Facturación ────────────────────────────────────────── */}
          {activeTab === 'billing' && (
            <div id="tour-cfg-content-billing" className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

              {/* ── Columna izquierda ── */}
              <div className="space-y-5">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-gray-700">Período de gracia</p>
                  <label className="text-xs font-medium text-gray-500">Días de gracia tras vencimiento</label>
                  <input
                    type="number" min={0} max={30}
                    value={form.gracePeriodDays ?? 3}
                    onChange={e => setForm(p => ({ ...p, gracePeriodDays: Math.max(0, parseInt(e.target.value) || 0) }))}
                    className="block border border-gray-300 rounded-lg px-3 py-2 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-slate-500 mt-1"
                  />
                  <p className="text-xs text-gray-400">
                    Días que el tenant puede seguir usando el sistema tras el vencimiento antes de ser bajado al plan gratuito.
                  </p>
                </div>

                <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 space-y-1">
                  <p className="font-medium">Flujo automático pre-vencimiento (siempre activo)</p>
                  <ul className="list-disc list-inside space-y-0.5 text-amber-700">
                    <li>7 días antes: aviso por correo</li>
                    <li>3 días antes: aviso urgente por correo</li>
                    <li>1 día / mismo día: aviso final por correo</li>
                    <li>Al vencer: inicio del período de gracia con aviso</li>
                    <li>Tras los días de gracia: baja automática al plan gratuito</li>
                  </ul>
                </div>
              </div>

              {/* ── Columna derecha ── */}
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Recordatorios de renovación por correo</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Envía emails a empresas que no han renovado tras el vencimiento.
                    </p>
                  </div>
                  <button
                    onClick={() => setForm(p => ({ ...p, expiryReminderEnabled: !p.expiryReminderEnabled }))}
                    className={`flex items-center gap-1 text-sm font-medium shrink-0 ${form.expiryReminderEnabled ? 'text-slate-700' : 'text-gray-400'}`}>
                    {form.expiryReminderEnabled ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                    {form.expiryReminderEnabled ? 'Activado' : 'Desactivado'}
                  </button>
                </div>

                {/* Destinatario — siempre visible */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-gray-500">Enviar a</label>
                  <div className="flex flex-col gap-2">
                    {([
                      { value: 'admin',   label: 'Administrador', hint: 'El usuario administrador de la empresa' },
                      { value: 'company', label: 'Empresa',       hint: 'El correo de contacto de la empresa'    },
                      { value: 'both',    label: 'Ambos',          hint: 'Administrador y correo de la empresa'  },
                    ] as const).map(opt => (
                      <label key={opt.value} className={`flex items-start gap-2.5 cursor-pointer ${!form.expiryReminderEnabled ? 'opacity-40 pointer-events-none' : ''}`}>
                        <input
                          type="radio"
                          name="expiryTarget"
                          value={opt.value}
                          checked={form.expiryReminderTarget === opt.value}
                          onChange={() => setForm(p => ({ ...p, expiryReminderTarget: opt.value }))}
                          className="mt-0.5 w-4 h-4 accent-slate-700"
                          disabled={!form.expiryReminderEnabled}
                        />
                        <div>
                          <p className="text-sm text-gray-700 font-medium">{opt.label}</p>
                          <p className="text-xs text-gray-400">{opt.hint}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Días — siempre visible */}
                <div className={`flex flex-col gap-1.5 ${!form.expiryReminderEnabled ? 'opacity-40 pointer-events-none' : ''}`}>
                  <label className="text-xs font-medium text-gray-500">
                    Días de recordatorio (después del vencimiento)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {REMINDER_DAY_OPTIONS.map(day => {
                      const selected: number[] = JSON.parse(form.expiryReminderDays || '[]')
                      const isActive = selected.includes(day)
                      return (
                        <button key={day} type="button"
                          onClick={() => {
                            const next = isActive
                              ? selected.filter(d => d !== day).sort((a, b) => a - b)
                              : [...selected, day].sort((a, b) => a - b)
                            setForm(p => ({ ...p, expiryReminderDays: JSON.stringify(next) }))
                          }}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
                            isActive ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-gray-600 border-gray-300 hover:border-slate-400'
                          }`}>
                          Día {day}
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-xs text-gray-400">Solo se envía una vez por día configurado.</p>
                </div>

                {/* Preview */}
                {(() => {
                  const days: number[] = JSON.parse(form.expiryReminderDays || '[]')
                  if (!form.expiryReminderEnabled || days.length === 0) return null
                  return (
                    <div className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 space-y-1">
                      <p className="font-medium">Secuencia configurada</p>
                      <ul className="list-disc list-inside space-y-0.5 text-blue-700">
                        {days.map(d => (
                          <li key={d}>Día {d} → correo a {
                            form.expiryReminderTarget === 'admin' ? 'administrador'
                            : form.expiryReminderTarget === 'company' ? 'empresa'
                            : 'administrador y empresa'
                          }</li>
                        ))}
                      </ul>
                    </div>
                  )
                })()}
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  )
}
