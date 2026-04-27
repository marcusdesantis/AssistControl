import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, Users, FileText, Building2, ToggleLeft, ToggleRight, Bell, Mail, Send, X } from 'lucide-react'
import { toast } from 'sonner'
import { sysTenantsService, type SysTenantDetail } from '../sysService'
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

function fmtMoney(n: number, c = 'usd') {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: c.toUpperCase() }).format(n)
}
function fmtDate(d?: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
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
      setTenant(prev => prev ? { ...prev, isActive: updated.isActive } : prev)
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
        <div id="tour-tenant-actions" className="flex items-center gap-2">
        <button onClick={() => setCompose('notify')}
          title="Enviar notificación"
          className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
          <Bell className="w-4 h-4" /> Notificación
        </button>
        <button onClick={() => setCompose('email')}
          title="Enviar correo"
          className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
          <Mail className="w-4 h-4" /> Correo
        </button>
        <button onClick={() => tenant.isActive ? setConfirmDeact(true) : handleToggle()} disabled={toggling}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
            tenant.isActive
              ? 'border-red-200 text-red-600 hover:bg-red-50'
              : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
          }`}>
          {toggling ? <Loader2 className="w-4 h-4 animate-spin" /> : tenant.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
          {tenant.isActive ? 'Desactivar' : 'Activar'}
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

          {sub && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Suscripción</p>
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
                  <span className="font-medium text-gray-700 capitalize">{sub.billingCycle === 'annual' ? 'Anual' : 'Mensual'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Precio</span>
                  <span className="font-medium text-gray-700">${sub.plan.priceMonthly}/mes</span>
                </div>
                {sub.currentPeriodEnd && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Renueva</span>
                    <span className="font-medium text-gray-700">{fmtDate(sub.currentPeriodEnd)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
