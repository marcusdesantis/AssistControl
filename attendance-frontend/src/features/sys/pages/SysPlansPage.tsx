import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Loader2, X, Check, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { sysPlansService, type SysPlan, type PlanCapabilities } from '../sysService'
import { createTour } from '@/utils/tour'
import HelpButton from '@/components/HelpButton'

const CAP_LABELS: { key: keyof PlanCapabilities; label: string; hint: string; hasLimit: boolean; limitLabel?: string; dependsOn?: keyof PlanCapabilities }[] = [
  { key: 'organization', label: 'Organización',     hint: 'Catálogos de departamentos y puestos de trabajo',        hasLimit: true,  limitLabel: 'Máx. departamentos' },
  { key: 'employees',    label: 'Empleados',       hint: 'Acceso al módulo de gestión de empleados',              hasLimit: true,  limitLabel: 'Máx. empleados',    dependsOn: 'organization' },
  { key: 'attendance',   label: 'Asistencia',      hint: 'Registro de entradas, salidas y marcaciones',            hasLimit: false                                   },
  { key: 'checker',      label: 'Reloj Checador',  hint: 'Acceso al checador web para marcar asistencia',          hasLimit: true,  limitLabel: 'Máx. registros/día' },
  { key: 'mobileApp',    label: 'App Móvil',        hint: 'Acceso a la aplicación móvil para marcar asistencia',   hasLimit: false,                dependsOn: 'checker' },
  { key: 'schedules',    label: 'Horarios',         hint: 'Gestión de horarios y turnos de trabajo por empleado',   hasLimit: true,  limitLabel: 'Máx. horarios'     },
  { key: 'messages',     label: 'Mensajes',         hint: 'Mensajería interna entre empleados y supervisores',      hasLimit: false                                   },
  { key: 'reports',      label: 'Reportes',         hint: 'Reportes y estadísticas avanzadas de asistencia',        hasLimit: false                                   },
  { key: 'settings',     label: 'Configuración',    hint: 'Acceso al módulo de configuración de la empresa',        hasLimit: false                                   },
]

const DEFAULT_CAPS: PlanCapabilities = {
  employees:    { enabled: true },
  attendance:   { enabled: true  },
  checker:      { enabled: true  },
  mobileApp:    { enabled: false },
  schedules:    { enabled: true },
  organization: { enabled: true },
  messages:     { enabled: false },
  reports:      { enabled: false },
  settings:     { enabled: true  },
}

function PlanModal({ plan, onClose, onSaved }: {
  plan?: SysPlan; onClose: () => void; onSaved: (p: SysPlan) => void
}) {
  const isEdit = !!plan
  const [form, setForm] = useState({
    name:         plan?.name         ?? '',
    description:  plan?.description  ?? '',
    priceMonthly: plan?.priceMonthly ?? 0,
    priceAnnual:  plan?.priceAnnual  ?? '',
    isFree:       plan?.isFree       ?? false,
    sortOrder:    plan?.sortOrder    ?? 0,
    features:     (() => { const f = plan?.features; if (!f) return ''; if (Array.isArray(f)) return (f as string[]).join('\n'); try { const p = JSON.parse(f as unknown as string); return Array.isArray(p) ? p.join('\n') : ''; } catch { return ''; } })(),
    capabilities: {
      employees:    { ...DEFAULT_CAPS.employees,    ...(plan?.capabilities?.employees    ?? {}) },
      attendance:   { ...DEFAULT_CAPS.attendance,   ...(plan?.capabilities?.attendance   ?? {}) },
      checker:      { ...DEFAULT_CAPS.checker,      ...(plan?.capabilities?.checker      ?? {}) },
      mobileApp:    { ...DEFAULT_CAPS.mobileApp,    ...(plan?.capabilities?.mobileApp    ?? {}) },
      schedules:    { ...DEFAULT_CAPS.schedules,    ...(plan?.capabilities?.schedules    ?? {}) },
      organization: { ...DEFAULT_CAPS.organization, ...(plan?.capabilities?.organization ?? {}) },
      messages:     { ...DEFAULT_CAPS.messages,     ...(plan?.capabilities?.messages     ?? {}) },
      reports:      { ...DEFAULT_CAPS.reports,      ...(plan?.capabilities?.reports      ?? {}) },
      settings:     { ...DEFAULT_CAPS.settings,     ...(plan?.capabilities?.settings     ?? {}) },
    },
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('El nombre es requerido.'); return }
    setSaving(true)
    try {
      const payload = {
        name:         form.name,
        description:  form.description,
        priceMonthly: Number(form.priceMonthly),
        priceAnnual:  form.priceAnnual !== '' ? Number(form.priceAnnual) : undefined,
        maxEmployees: form.capabilities.employees.limit ?? undefined,
        isFree:       form.isFree,
        sortOrder:    Number(form.sortOrder),
        features:     form.features.split('\n').map(s => s.trim()).filter(Boolean),
        capabilities: form.capabilities,
      }
      const saved = isEdit
        ? await sysPlansService.update(plan!.id, payload)
        : await sysPlansService.create(payload)
      onSaved(saved!)
      window.dispatchEvent(new Event('capabilities-changed'))
      toast.success(isEdit ? 'Plan actualizado.' : 'Plan creado.')
      onClose()
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Error al guardar.')
    } finally { setSaving(false) }
  }

  const f = (k: keyof typeof form, v: string | boolean | number) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" style={{marginTop: 0}}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">

        {/* Header fijo */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
          <h3 className="font-semibold text-gray-900">{isEdit ? 'Editar plan' : 'Nuevo plan'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
        </div>

        {/* Body scrollable */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-3">
          {([
            ['Nombre',        'name',        'text',   'Básico'],
            ['Descripción',   'description', 'text',   'Plan gratuito para comenzar'],
          ] as [string, keyof typeof form, string, string][]).map(([label, key, type, ph]) => (
            <div key={key}>
              <label className="text-xs font-medium text-gray-500 block mb-1">{label}</label>
              <input type={type} value={String(form[key])} onChange={e => f(key, e.target.value)} placeholder={ph}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>
          ))}

          <div className="grid grid-cols-2 gap-3">
            {([
              ['Precio/mes (USD)', 'priceMonthly', '0'],
              ['Precio/año (USD)', 'priceAnnual',  ''],
            ] as [string, keyof typeof form, string][]).map(([label, key, ph]) => (
              <div key={key}>
                <label className="text-xs font-medium text-gray-500 block mb-1">{label}</label>
                <input type="number" min={0} value={String(form[key])} onChange={e => f(key, e.target.value)} placeholder={ph}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
              </div>
            ))}
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">
              Orden de visualización
              <span className="font-normal text-gray-400 ml-1">(posición en el carrusel de planes)</span>
            </label>
            <input type="number" min={0} value={String(form.sortOrder)} onChange={e => f('sortOrder', e.target.value)}
              className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">
              Características <span className="font-normal text-gray-400">(una por línea)</span>
            </label>
            <textarea
              rows={4}
              value={form.features}
              onChange={e => f('features', e.target.value)}
              placeholder={"Hasta 20 empleados\nChecador web y móvil\nSoporte por correo"}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 block mb-2">Módulos incluidos</label>
            <div className="space-y-2">
              {CAP_LABELS.map(({ key, label, hint, hasLimit, limitLabel, dependsOn }) => {
                const cap      = form.capabilities[key]
                const blocked  = !!dependsOn && !form.capabilities[dependsOn].enabled
                return (
                  <div key={key} className={`rounded-lg border px-3 py-2 transition-colors ${blocked ? 'border-gray-100 bg-gray-50 opacity-50' : 'border-gray-100 bg-gray-50'}`}>
                    <label className={`flex items-start gap-2.5 ${blocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                      <input
                        type="checkbox"
                        checked={cap.enabled && !blocked}
                        disabled={blocked}
                        onChange={e => {
                          if (blocked) return
                          const checked = e.target.checked
                          setForm(p => {
                            const caps = { ...p.capabilities, [key]: { ...p.capabilities[key], enabled: checked } }
                            if (!checked) {
                              CAP_LABELS.forEach(c => { if (c.dependsOn === key) caps[c.key] = { ...caps[c.key], enabled: false } })
                            }
                            return { ...p, capabilities: caps }
                          })
                        }}
                        className="w-4 h-4 rounded accent-slate-700 mt-0.5 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 font-medium leading-tight">{label}</p>
                        <p className="text-xs text-gray-400 leading-tight mt-0.5">
                          {blocked ? `Requiere activar ${CAP_LABELS.find(c => c.key === dependsOn)?.label ?? dependsOn} primero` : hint}
                        </p>
                      </div>
                    </label>
                    {hasLimit && cap.enabled && !blocked && (
                      <div className="mt-2 flex items-center gap-2" style={{ marginLeft: '1.625rem' }}>
                        <input
                          type="number"
                          min={1}
                          value={cap.limit ?? ''}
                          onChange={e => setForm(p => ({
                            ...p,
                            capabilities: {
                              ...p.capabilities,
                              [key]: { ...p.capabilities[key], limit: e.target.value === '' ? null : Number(e.target.value) }
                            }
                          }))}
                          placeholder="Sin límite"
                          className="w-32 border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                        />
                        <span className="text-xs text-gray-400">{limitLabel} (vacío = ilimitado)</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isFree} onChange={e => f('isFree', e.target.checked)}
              className="w-4 h-4 rounded accent-slate-700" />
            <span className="text-sm text-gray-700">Plan gratuito</span>
          </label>
        </div>

        {/* Footer fijo */}
        <div className="flex gap-2 px-6 py-4 border-t border-gray-100 shrink-0">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {isEdit ? 'Guardar' : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ReassignModal({ plan, plans, onClose, onDeleted }: {
  plan: SysPlan
  plans: SysPlan[]
  onClose: () => void
  onDeleted: (id: string) => void
}) {
  const options = plans.filter(p => p.id !== plan.id)
  const [tenants,    setTenants]    = useState<{ tenantId: string; tenant: { name: string } }[]>([])
  const [targetId,   setTargetId]   = useState(options[0]?.id ?? '')
  const [loading,    setLoading]    = useState(true)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    sysPlansService.tenants(plan.id)
      .then(setTenants)
      .catch(() => toast.error('Error al cargar empresas.'))
      .finally(() => setLoading(false))
  }, [plan.id])

  const handleConfirm = async () => {
    if (!targetId) return
    setConfirming(true)
    try {
      await sysPlansService.delete(plan.id, targetId)
      onDeleted(plan.id)
      toast.success(`Plan eliminado. Empresas reasignadas a "${options.find(p => p.id === targetId)?.name}".`)
      onClose()
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Error al eliminar.')
    } finally { setConfirming(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" style={{marginTop: 0}}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0 mt-0.5">
            <AlertTriangle className="w-4.5 h-4.5 text-amber-500" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Reasignar antes de eliminar</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              El plan <span className="font-medium text-gray-700">"{plan.name}"</span> tiene empresas activas.
              Elige un plan de destino antes de eliminarlo.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
        ) : (
          <>
            <div className="bg-gray-50 rounded-xl border border-gray-100 divide-y divide-gray-100 max-h-40 overflow-y-auto">
              {tenants.map(t => (
                <div key={t.tenantId} className="px-3 py-2 text-sm text-gray-700">{t.tenant.name}</div>
              ))}
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1.5">Reasignar a</label>
              <select
                value={targetId}
                onChange={e => setTargetId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white">
                {options.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </>
        )}

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
            Cancelar
          </button>
          <button onClick={handleConfirm} disabled={confirming || loading || !targetId}
            className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
            {confirming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Reasignar y eliminar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SysPlansPage() {
  const [plans,         setPlans]         = useState<SysPlan[]>([])
  const [loading,       setLoading]       = useState(true)
  const [modal,         setModal]         = useState<{ open: boolean; plan?: SysPlan }>({ open: false })
  const [deleting,      setDeleting]      = useState<string | null>(null)
  const [reassigning,   setReassigning]   = useState<SysPlan | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<SysPlan | null>(null)

  useEffect(() => {
    sysPlansService.list()
      .then(setPlans)
      .finally(() => setLoading(false))
  }, [])

  const handleSaved = (p: SysPlan) => {
    setPlans(prev => {
      const idx = prev.findIndex(x => x.id === p.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = p; return next }
      return [...prev, p].sort((a, b) => a.sortOrder - b.sortOrder)
    })
  }

  const handleDelete = async (plan: SysPlan) => {
    setDeleting(plan.id)
    try {
      await sysPlansService.delete(plan.id)
      setPlans(prev => prev.filter(p => p.id !== plan.id))
      toast.success('Plan eliminado.')
    } catch (e: any) {
      const msg: string = e?.response?.data?.message ?? ''
      if (msg.includes('suscripciones activas')) {
        setReassigning(plan)
      } else {
        toast.error(msg || 'Error al eliminar.')
      }
    } finally { setDeleting(null) }
  }

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 className="w-5 h-5 animate-spin text-slate-500" /></div>

  function runTour() {
    createTour([
      { element: '#tour-plans-header', title: 'Planes de suscripción',  description: 'Aquí se definen los planes que se ofrecen a las empresas. Cada plan tiene un precio mensual/anual y un conjunto de capacidades (módulos habilitados y límites).' },
      { element: '#tour-plans-new',    title: 'Nuevo plan',             description: 'Crea un nuevo plan configurando su nombre, precio, si es gratuito, y qué módulos incluye. Las empresas solo pueden acceder a los módulos que su plan tiene activados.' },
      { element: '#tour-plans-cards',  title: 'Tarjetas de planes',     description: 'Cada tarjeta muestra el nombre, precio y características del plan. Puedes editarlo o eliminarlo (si no tiene empresas activas). El plan DEFAULT es el que se asigna por defecto a empresas nuevas.' },
    ]).drive()
  }

  return (
    <div className="space-y-5">

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-base font-semibold text-gray-900">¿Eliminar plan?</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              El plan <span className="font-medium text-gray-800">"{confirmDelete.name}"</span> será eliminado permanentemente. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button onClick={async () => { const p = confirmDelete; setConfirmDelete(null); await handleDelete(p) }}
                className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors flex items-center justify-center gap-2">
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      <div id="tour-plans-header" className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Planes</h1>
          <p className="text-gray-500 text-sm mt-0.5">Gestiona los planes de suscripción</p>
          <div className="mt-1"><HelpButton onClick={runTour} /></div>
        </div>
        <button id="tour-plans-new" onClick={() => setModal({ open: true })}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-900 transition-colors">
          <Plus className="w-4 h-4" /> Nuevo plan
        </button>
      </div>

      <div id="tour-plans-cards" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {plans.map(plan => (
          <div key={plan.id} className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-bold text-gray-900">{plan.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{plan.description}</p>
              </div>
              <div className="flex items-center gap-1">
                {plan.isDefault && <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-semibold">DEFAULT</span>}
                {plan.isFree    && <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-semibold">FREE</span>}
              </div>
            </div>
            <div className="text-2xl font-black text-gray-900">
              {plan.isFree ? 'Gratis' : `$${plan.priceMonthly}`}
              {!plan.isFree && <span className="text-sm font-normal text-gray-400">/mes</span>}
            </div>
            {plan.priceAnnual && <p className="text-xs text-gray-400">${plan.priceAnnual}/año</p>}
            {Array.isArray(plan.features) && plan.features.length > 0 && (
              <ul className="space-y-1 mt-1">
                {plan.features.map((f, i) => (
                  <li key={i} className="text-xs text-gray-500 flex items-start gap-1.5">
                    <span className="text-emerald-500 mt-0.5">✓</span>{f}
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2 mt-auto pt-2 border-t border-gray-100">
              <button onClick={() => setModal({ open: true, plan })}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg border border-gray-200 transition-colors">
                <Pencil className="w-3.5 h-3.5" /> Editar
              </button>
              {!plan.isDefault && (
                <button onClick={() => setConfirmDelete(plan)} disabled={deleting === plan.id}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 rounded-lg border border-gray-200 transition-colors disabled:opacity-40">
                  {deleting === plan.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  Eliminar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {modal.open && (
        <PlanModal plan={modal.plan} onClose={() => setModal({ open: false })} onSaved={handleSaved} />
      )}

      {reassigning && (
        <ReassignModal
          plan={reassigning}
          plans={plans}
          onClose={() => setReassigning(null)}
          onDeleted={id => setPlans(prev => prev.filter(p => p.id !== id))}
        />
      )}
    </div>
  )
}
