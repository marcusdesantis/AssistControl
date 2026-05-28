import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, Users, FileText, Building2, ToggleLeft, ToggleRight, Bell, Mail, X, Pencil, Trash2, AlertTriangle, CreditCard, CheckCircle2, UserCog, Send } from 'lucide-react'
import { toast } from 'sonner'
import { sysTenantsService, sysPlansService, sysSubscriptionsService, type SysTenantDetail, type SysTenant, type SysPlan } from '../sysService'
import { createTour } from '@/utils/tour'
import HelpButton from '@/components/HelpButton'

type ComposeMode = 'notify' | 'email'

function ComposeModal({ mode, onClose, onSend }: {
  mode: ComposeMode
  onClose: () => void
  onSend: (data: { title?: string; subject?: string; body: string; type?: string; target?: string }) => Promise<void>
}) {
  const [title,   setTitle]   = useState('')
  const [subject, setSubject] = useState('')
  const [body,    setBody]    = useState('')
  const [type,    setType]    = useState('info')
  const [target,  setTarget]  = useState<'admin' | 'company'>('admin')
  const [sending, setSending] = useState(false)

  const isNotify = mode === 'notify'

  const handleSend = async () => {
    if (isNotify && !title.trim()) { toast.error('El título es requerido.'); return }
    if (!isNotify && !subject.trim()) { toast.error('El asunto es requerido.'); return }
    if (!body.trim()) { toast.error('El mensaje es requerido.'); return }
    setSending(true)
    try { await onSend({ title: title || undefined, subject: subject || undefined, body, type, target }); onClose() }
    finally { setSending(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            {isNotify ? <Bell className="w-4 h-4 text-slate-600" /> : <Mail className="w-4 h-4 text-slate-600" />}
            <h2 className="text-base font-semibold text-gray-900">{isNotify ? 'Enviar notificación' : 'Enviar correo'}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {!isNotify && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Enviar a</label>
              <select value={target} onChange={e => setTarget(e.target.value as 'admin' | 'company')}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400">
                <option value="admin">Administrador (usuario con email)</option>
                <option value="company">Empresa (correo de contacto)</option>
              </select>
            </div>
          )}
          {isNotify ? (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Título</label>
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej: Actualización del sistema"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
                <select value={type} onChange={e => setType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400">
                  <option value="info">Información</option>
                  <option value="success">Éxito</option>
                  <option value="warning">Advertencia</option>
                  <option value="error">Error</option>
                </select>
              </div>
            </>
          ) : (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Asunto</label>
              <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Asunto del correo"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Mensaje</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={5}
              placeholder={isNotify ? 'Escribe el mensaje de la notificación...' : 'Escribe el cuerpo del correo...'}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none" />
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose}
              className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button onClick={handleSend} disabled={sending}
              className="flex-1 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-900 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              {isNotify ? 'Enviar notificación' : 'Enviar correo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const DEFAULT_TZ = 'America/Guayaquil'

function fmtMoney(n: number, c = 'usd') {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: c.toUpperCase() }).format(n)
}
function fmtDate(d?: string | null, tz = DEFAULT_TZ) {
  if (!d) return '—'
  return new Intl.DateTimeFormat('es-MX', { timeZone: tz, day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(d))
}

// Convert UTC ISO string → "YYYY-MM-DDTHH:mm:ss" in the given timezone (for datetime-local input value)
function utcToLocalDt(utcStr: string, tz: string): string {
  const d = new Date(utcStr)
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(d)
  const g = (t: string) => parts.find(p => p.type === t)?.value ?? '00'
  return `${g('year')}-${g('month')}-${g('day')}T${g('hour')}:${g('minute')}:${g('second')}`
}

// Convert "YYYY-MM-DDTHH:mm:ss" in the given timezone → UTC ISO string
function localDtToUtc(localStr: string, tz: string): string {
  const [datePart, timePart = '00:00:00'] = localStr.split('T')
  const [y, mo, d] = datePart.split('-').map(Number)
  const [h, mi, s = 0] = timePart.split(':').map(Number)
  const tempUtc = Date.UTC(y, mo - 1, d, h, mi, s)
  const fp = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(new Date(tempUtc))
  const gp = (t: string) => parseInt(fp.find(p => p.type === t)?.value ?? '0')
  const diff = tempUtc - Date.UTC(gp('year'), gp('month') - 1, gp('day'), gp('hour'), gp('minute'), gp('second'))
  return new Date(tempUtc + diff).toISOString()
}

const COUNTRIES: { code: string; name: string; tz: string }[] = [
  { code: 'EC', name: 'Ecuador',             tz: 'America/Guayaquil' },
  { code: 'CO', name: 'Colombia',            tz: 'America/Bogota' },
  { code: 'PE', name: 'Perú',                tz: 'America/Lima' },
  { code: 'MX', name: 'México',              tz: 'America/Mexico_City' },
  { code: 'AR', name: 'Argentina',           tz: 'America/Argentina/Buenos_Aires' },
  { code: 'CL', name: 'Chile',               tz: 'America/Santiago' },
  { code: 'VE', name: 'Venezuela',           tz: 'America/Caracas' },
  { code: 'BO', name: 'Bolivia',             tz: 'America/La_Paz' },
  { code: 'PY', name: 'Paraguay',            tz: 'America/Asuncion' },
  { code: 'UY', name: 'Uruguay',             tz: 'America/Montevideo' },
  { code: 'PA', name: 'Panamá',              tz: 'America/Panama' },
  { code: 'CR', name: 'Costa Rica',          tz: 'America/Costa_Rica' },
  { code: 'GT', name: 'Guatemala',           tz: 'America/Guatemala' },
  { code: 'BR', name: 'Brasil',              tz: 'America/Sao_Paulo' },
  { code: 'US', name: 'Estados Unidos (ET)', tz: 'America/New_York' },
  { code: 'ES', name: 'España',              tz: 'Europe/Madrid' },
]

// ─── Modal eliminar empresa ───────────────────────────────────────────────────
function DeleteTenantModal({ tenant, onClose, onDeleted }: {
  tenant: SysTenant; onClose: () => void; onDeleted: () => void
}) {
  const [confirm,  setConfirm]  = useState('')
  const [deleting, setDeleting] = useState(false)
  const isMatch = confirm.trim().toLowerCase() === tenant.name.trim().toLowerCase()

  const handleDelete = async () => {
    if (!isMatch) return
    setDeleting(true)
    try {
      await sysTenantsService.delete(tenant.id)
      toast.success('Empresa eliminada permanentemente.')
      onDeleted()
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Error al eliminar.')
    } finally { setDeleting(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" style={{marginTop:0}}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="h-1.5 w-full bg-red-500" />
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Eliminar empresa permanentemente</h2>
              <p className="text-sm text-gray-500 mt-0.5">Esta acción no se puede deshacer.</p>
            </div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-1.5 text-sm text-red-800">
            <p className="font-semibold">Se eliminará todo lo relacionado a <span className="font-bold">"{tenant.name}"</span>:</p>
            <ul className="list-disc list-inside space-y-0.5 text-red-700">
              <li>Empleados y sus registros de asistencia</li>
              <li>Departamentos, cargos y horarios</li>
              <li>Usuarios administradores</li>
              <li>Mensajes, invitaciones y notificaciones</li>
              <li>Suscripción, facturas y métodos de pago</li>
              <li>Tickets de soporte</li>
            </ul>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Escribe el nombre de la empresa para confirmar: <span className="font-bold text-gray-900">"{tenant.name}"</span>
            </label>
            <input value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Escribe el nombre exacto..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button onClick={handleDelete} disabled={!isMatch || deleting}
              className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Eliminar permanentemente
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Modal editar empresa ─────────────────────────────────────────────────────
function EditTenantModal({ tenant, onClose, onSaved }: {
  tenant: SysTenant; onClose: () => void; onSaved: (t: SysTenant) => void
}) {
  const d = tenant as any
  const [form, setForm] = useState({
    name: tenant.name, legalName: tenant.legalName ?? '', timeZone: tenant.timeZone, country: tenant.country,
    taxId: d.taxId ?? '', businessLicense: d.businessLicense ?? '',
    street: d.street ?? '', betweenStreets: d.betweenStreets ?? '',
    city: d.city ?? '', postalCode: d.postalCode ?? '', state: d.state ?? '',
    phone1: d.phone1 ?? '', phone2: d.phone2 ?? '', fax: d.fax ?? '',
    email: d.email ?? '', website: d.website ?? '',
  })
  const [saving, setSaving] = useState(false)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (k === 'timeZone') {
      const found = COUNTRIES.find(c => c.tz === e.target.value)
      if (found) setForm(p => ({ ...p, timeZone: found.tz, country: found.code }))
    } else {
      setForm(p => ({ ...p, [k]: e.target.value }))
    }
  }

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!form.name.trim()) { toast.error('El nombre es requerido.'); return }
    setSaving(true)
    try {
      const updated = await sysTenantsService.update(tenant.id, {
        name: form.name.trim(), legalName: form.legalName.trim() || undefined,
        country: form.country, timeZone: form.timeZone,
        taxId: form.taxId.trim() || undefined, businessLicense: form.businessLicense.trim() || undefined,
        street: form.street.trim() || undefined, betweenStreets: form.betweenStreets.trim() || undefined,
        city: form.city.trim() || undefined, postalCode: form.postalCode.trim() || undefined, state: form.state.trim() || undefined,
        phone1: form.phone1.trim() || undefined, phone2: form.phone2.trim() || undefined, fax: form.fax.trim() || undefined,
        email: form.email.trim() || undefined, website: form.website.trim() || undefined,
      })
      toast.success('Empresa actualizada.')
      onSaved(updated)
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Error al actualizar.')
    } finally { setSaving(false) }
  }

  const inp = (label: string, k: keyof typeof form, placeholder?: string, type = 'text') => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input type={type} value={form[k]} onChange={set(k)} placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" style={{marginTop:0}}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">Editar empresa</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5 overflow-y-auto flex-1">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Datos generales</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">{inp('Nombre / Razón social *', 'name')}</div>
              {inp('Nombre comercial', 'legalName')}
              {inp('RUC', 'taxId')}
              {inp('Representante', 'businessLicense')}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">País / Zona horaria</label>
                <select value={form.timeZone} onChange={set('timeZone')}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400">
                  {COUNTRIES.map((c, i) => <option key={i} value={c.tz}>{c.name} — {c.tz}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Dirección</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {inp('Ciudad', 'city')} {inp('Estado', 'state')} {inp('Código postal', 'postalCode')}
              <div className="sm:col-span-3">{inp('Calle y número', 'street')}</div>
              <div className="sm:col-span-3">{inp('Entre las calles', 'betweenStreets')}</div>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Contacto</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {inp('Teléfono 1', 'phone1', '(000) 000-0000')}
              {inp('Teléfono 2', 'phone2', '(000) 000-0000')}
              {inp('Fax', 'fax')}
              {inp('Correo electrónico', 'email', undefined, 'email')}
              <div className="sm:col-span-2">{inp('Sitio web', 'website', 'https://www.empresa.com')}</div>
            </div>
          </div>
          <div className="flex gap-3 pt-2 sticky bottom-0 bg-white pb-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-900 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Modal cambiar plan ───────────────────────────────────────────────────────

function ChangePlanModal({ tenantId, currentPlanId, initDateFrom, initDateTo, timeZone, onClose, onSaved }: {
  tenantId: string; currentPlanId?: string
  initDateFrom?: string | null; initDateTo?: string | null
  timeZone?: string | null
  onClose: () => void; onSaved: () => void
}) {
  const tz = timeZone || DEFAULT_TZ
  const [plans,   setPlans]   = useState<SysPlan[]>([])
  const [planId,  setPlanId]  = useState(currentPlanId ?? '')
  const [cycle] = useState<'monthly' | 'annual'>('monthly')
  const [dateFrom, setDateFrom] = useState(initDateFrom ? utcToLocalDt(initDateFrom, tz) : '')
  const [dateTo,   setDateTo]   = useState(initDateTo   ? utcToLocalDt(initDateTo, tz)   : '')
  const [datesModified, setDatesModified] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    sysPlansService.list()
      .then(p => { setPlans(p); if (!currentPlanId && p.length) setPlanId(p[0].id) })
      .finally(() => setLoading(false))
  }, [])



  const selected = plans.find(p => p.id === planId)

  const handleSave = async () => {
    if (!planId) return
    setSaving(true)
    try {
      await sysSubscriptionsService.changePlan(tenantId, planId, cycle)
      if (selected && !selected.isFree && datesModified && dateFrom && dateTo) {
        await sysSubscriptionsService.updateDates(
          tenantId,
          dateFrom ? localDtToUtc(dateFrom, tz) : null,
          dateTo   ? localDtToUtc(dateTo,   tz) : null,
        )
      }
      toast.success('Plan actualizado correctamente.')
      onSaved()
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Error al cambiar el plan.')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" style={{marginTop:0}}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-slate-500" />
            <h2 className="text-base font-semibold text-gray-900">Cambiar plan</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
          ) : (
            <>
              {/* Planes */}
              <div className="space-y-2">
                {plans.map(p => (
                  <button key={p.id} onClick={() => setPlanId(p.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all flex items-center justify-between gap-3 ${planId === p.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <div>
                      <p className={`text-sm font-semibold ${planId === p.id ? 'text-primary-700' : 'text-gray-800'}`}>{p.name}</p>
                      <p className="text-xs text-gray-400">{p.isFree ? 'Gratis' : `$${p.priceMonthly}/mes`}</p>
                    </div>
                    {planId === p.id && <CheckCircle2 className="w-4 h-4 text-primary-600 shrink-0" />}
                  </button>
                ))}
              </div>

              {/* Fechas (solo planes de pago) */}
              {selected && !selected.isFree && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Inicio</label>
                    <input type="datetime-local" value={dateFrom} step="1" onChange={e => { setDateFrom(e.target.value); setDatesModified(true) }}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Vence</label>
                    <input type="datetime-local" value={dateTo} step="1" onChange={e => { setDateTo(e.target.value); setDatesModified(true) }}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300" />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        <div className="px-5 pb-5 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving || loading || !planId}
            className="flex-1 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Guardar
          </button>
        </div>
      </div>
    </div>
  )
}

const SUB_STATUS: Record<string, { label: string; cls: string }> = {
  active:   { label: 'Activa',    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  trialing: { label: 'Prueba',    cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  past_due: { label: 'Vencida',   cls: 'bg-red-50 text-red-700 border-red-200' },
  canceled: { label: 'Cancelada', cls: 'bg-gray-100 text-gray-500 border-gray-200' },
}

export default function SysTenantDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tenant,       setTenant]       = useState<SysTenantDetail | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [toggling,     setToggling]     = useState(false)
  const [compose,      setCompose]      = useState<ComposeMode | null>(null)
  const [confirmDeact, setConfirmDeact] = useState(false)
  const [showEdit,     setShowEdit]     = useState(false)
  const [showDelete,   setShowDelete]   = useState(false)
  const [showPlan,     setShowPlan]     = useState(false)

  useEffect(() => {
    if (!id) return
    sysTenantsService.get(id)
      .then(setTenant)
      .catch(() => toast.error('Error al cargar la empresa.'))
      .finally(() => setLoading(false))
  }, [id])

  const handleToggle = async () => {
    if (!tenant) return
    setToggling(true)
    try {
      const updated = await sysTenantsService.toggle(tenant.id)
      setTenant(prev => prev ? { ...prev, isActive: updated.isActive } as SysTenantDetail : prev)
      toast.success(`Empresa ${updated.isActive ? 'activada' : 'desactivada'}.`)
    } catch { toast.error('Error al cambiar el estado.') }
    finally { setToggling(false) }
  }

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 className="w-6 h-6 animate-spin text-slate-500" /></div>
  if (!tenant) return <div className="text-center py-24 text-gray-400">Empresa no encontrada.</div>

  const sub = tenant.subscription
  const subBadge = sub ? (SUB_STATUS[sub.status] ?? SUB_STATUS.canceled) : null

  function runTour() {
    createTour([
      { element: '#tour-tenant-header', title: 'Detalle de empresa',      description: 'Esta pantalla muestra toda la información de la empresa: datos generales, suscripción activa, facturas y empleados.' },
      { element: '#tour-tenant-info',   title: 'Información general',     description: 'País, zona horaria, RFC y fecha de creación de la empresa. Esta información se configura al crear la empresa.' },
      { element: '#tour-tenant-sub',    title: 'Suscripción',             description: 'Plan activo de la empresa, fechas de inicio y vencimiento, monto y estado. Si el estado es "Vencida" la empresa no tiene acceso al sistema.' },
      { element: '#tour-tenant-actions',title: 'Acciones',                description: 'Puedes enviar una notificación interna, enviar un correo al administrador o a la empresa, y activar/desactivar el acceso de la empresa al sistema.' },
    ]).drive()
  }

  const handleSend = async (data: { title?: string; subject?: string; body: string; type?: string; target?: string }) => {
    if (!compose) return
    try {
      if (compose === 'notify') {
        await sysTenantsService.notify(tenant.id, { title: data.title!, body: data.body, type: data.type })
        toast.success('Notificación enviada.')
      } else {
        await sysTenantsService.email(tenant.id, { subject: data.subject!, body: data.body, target: data.target })
        toast.success('Correo enviado.')
      }
    } catch (err: any) { toast.error(err?.response?.data?.message ?? 'Error al enviar.'); throw err }
  }

  return (
    <div className="space-y-5">
      {compose && (
        <ComposeModal mode={compose} onClose={() => setCompose(null)} onSend={handleSend} />
      )}

      {showEdit && (
        <EditTenantModal
          tenant={tenant as unknown as SysTenant}
          onClose={() => setShowEdit(false)}
          onSaved={updated => { setTenant(t => t ? { ...t, ...updated } as SysTenantDetail : t); setShowEdit(false) }}
        />
      )}

      {showDelete && (
        <DeleteTenantModal
          tenant={tenant as unknown as SysTenant}
          onClose={() => setShowDelete(false)}
          onDeleted={() => navigate('/sys/tenants')}
        />
      )}

      {showPlan && (
        <ChangePlanModal
          tenantId={tenant.id}
          currentPlanId={tenant.subscription?.plan?.id}
          initDateFrom={tenant.subscription?.currentPeriodStart ?? null}
          initDateTo={tenant.subscription?.currentPeriodEnd ?? null}
          timeZone={tenant.timeZone}
          onClose={() => setShowPlan(false)}
          onSaved={() => { setShowPlan(false); sysTenantsService.get(tenant.id).then(setTenant).catch(() => {}) }}
        />
      )}

      {confirmDeact && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-base font-semibold text-gray-900">¿Desactivar empresa?</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              La empresa <span className="font-medium text-gray-800">{tenant.name}</span> perderá acceso inmediatamente y sus usuarios serán desconectados.
            </p>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setConfirmDeact(false)}
                className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button onClick={async () => { setConfirmDeact(false); await handleToggle() }} disabled={toggling}
                className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-50 transition-colors">
                Sí, desactivar
              </button>
            </div>
          </div>
        </div>
      )}

      <div id="tour-tenant-header" className="flex items-center gap-3">
        <button onClick={() => navigate('/sys/tenants')}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">{tenant.name}</h1>
          {tenant.legalName && <p className="text-gray-500 text-sm">{tenant.legalName}</p>}
          <div className="mt-0.5"><HelpButton onClick={runTour} /></div>
        </div>
        <div id="tour-tenant-actions" className="flex flex-wrap items-center gap-2">
          <button onClick={() => setCompose('notify')} title="Enviar notificación"
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            <Bell className="w-4 h-4" /> <span className="hidden sm:inline">Notificación</span>
          </button>
          <button onClick={() => setCompose('email')} title="Enviar correo"
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            <Mail className="w-4 h-4" /> <span className="hidden sm:inline">Correo</span>
          </button>
          <button onClick={() => setShowEdit(true)} title="Editar empresa"
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            <Pencil className="w-4 h-4" /> <span className="hidden sm:inline">Editar</span>
          </button>
          <button onClick={() => tenant.isActive ? setConfirmDeact(true) : handleToggle()} disabled={toggling}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
              tenant.isActive ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
            }`}>
            {toggling ? <Loader2 className="w-4 h-4 animate-spin" /> : tenant.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
            <span className="hidden sm:inline">{tenant.isActive ? 'Desactivar' : 'Activar'}</span>
          </button>
          <button onClick={() => setShowDelete(true)} title="Eliminar empresa"
            className="flex items-center gap-2 px-3 py-2 border border-red-200 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors">
            <Trash2 className="w-4 h-4" /> <span className="hidden sm:inline">Eliminar</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Info */}
        <div className="lg:col-span-2 space-y-4">
          <div id="tour-tenant-info" className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5" /> Información general
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                ['País',          tenant.country],
                ['Zona horaria',  tenant.timeZone],
                ['RFC / Tax ID',  tenant.taxId ?? '—'],
                ['Creada el',     fmtDate(tenant.createdAt)],
                ['Estado',        tenant.isActive ? 'Activa' : 'Inactiva'],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-gray-400 text-xs mb-0.5">{label}</p>
                  <p className="font-medium text-gray-800">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Facturas */}
          {tenant.invoices.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <p className="px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100 flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" /> Últimas facturas
              </p>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-50">
                  {tenant.invoices.map(inv => (
                    <tr key={inv.id} className="px-5">
                      <td className="px-5 py-3 text-gray-600">{fmtDate(inv.createdAt)}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{fmtMoney(inv.amount, inv.currency)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                          inv.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                        }`}>{inv.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Stats + Suscripción */}
        <div className="space-y-4">
          <div id="tour-tenant-sub" className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Empleados</p>
                <p className="text-xl font-bold text-gray-900">{tenant._count.employees}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Usuarios admin</p>
                <p className="text-xl font-bold text-gray-900">{tenant._count.users}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Suscripción</p>
              <button onClick={() => setShowPlan(true)}
                className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-700 font-medium">
                <CreditCard className="w-3.5 h-3.5" /> {sub ? 'Cambiar plan' : 'Asignar plan'}
              </button>
            </div>
            {sub ? (
              <>
                <div>
                  <p className="font-bold text-gray-900 text-lg">{sub.plan.name}</p>
                  {subBadge && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${subBadge.cls}`}>
                      {subBadge.label}
                    </span>
                  )}
                </div>
                <div className="text-sm space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Ciclo</span>
                    <span className="font-medium text-gray-700">{sub.billingCycle === 'annual' ? 'Anual' : 'Mensual'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Precio</span>
                    <span className="font-medium text-gray-700">${sub.plan.priceMonthly}/mes</span>
                  </div>
                  {sub.currentPeriodStart && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Inicio</span>
                      <span className="font-medium text-gray-700">{fmtDate(sub.currentPeriodStart, tenant.timeZone)}</span>
                    </div>
                  )}
                  {sub.currentPeriodEnd && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Vence</span>
                      <span className="font-medium text-gray-700">{fmtDate(sub.currentPeriodEnd, tenant.timeZone)}</span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-400">Sin plan asignado</p>
            )}
          </div>

          {/* Usuarios */}
          {tenant.users && tenant.users.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <p className="px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100 flex items-center gap-2">
                <UserCog className="w-3.5 h-3.5" /> Usuarios administradores
              </p>
              <div className="divide-y divide-gray-50">
                {tenant.users.map(u => (
                  <div key={u.id} className="flex items-center justify-between px-5 py-3 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center shrink-0">
                        <span className="text-slate-600 text-xs font-bold">{u.username.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">@{u.username}</p>
                        <p className="text-xs text-gray-400 truncate">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${u.role === 'Admin' ? 'bg-blue-50 text-blue-700' : u.role === 'Supervisor' ? 'bg-violet-50 text-violet-700' : 'bg-gray-100 text-gray-500'}`}>
                        {u.role}
                      </span>
                      {u.lastLoginAt && (
                        <p className="text-[10px] text-gray-400">Último: {fmtDate(u.lastLoginAt)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
