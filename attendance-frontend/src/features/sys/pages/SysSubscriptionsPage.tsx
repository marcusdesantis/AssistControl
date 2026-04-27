import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, CalendarDays, X, History, Search } from 'lucide-react'
import { toast } from 'sonner'
import { sysSubscriptionsService, sysPlansService, type SysSubscription, type SysPlan } from '../sysService'
import Pagination from '@/components/Pagination'
import { createTour } from '@/utils/tour'
import HelpButton from '@/components/HelpButton'

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  active:   { label: 'Activa',    cls: 'bg-emerald-50 text-emerald-700' },
  trialing: { label: 'Prueba',    cls: 'bg-blue-50 text-blue-700' },
  past_due: { label: 'Vencida',   cls: 'bg-red-50 text-red-700' },
  canceled: { label: 'Cancelada', cls: 'bg-gray-100 text-gray-500' },
}

function fmtDateTime(d?: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleString('es-EC', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function toDatetimeLocal(d?: string | null) {
  if (!d) return ''
  const dt = new Date(d)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`
}

// ─── Modal editar fechas ──────────────────────────────────────────────────────

function EditDatesModal({ sub, onClose, onSaved }: { sub: SysSubscription; onClose: () => void; onSaved: (updated: SysSubscription) => void }) {
  const [start,  setStart]  = useState(toDatetimeLocal(sub.currentPeriodStart))
  const [end,    setEnd]    = useState(toDatetimeLocal(sub.currentPeriodEnd))
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      const updated = await sysSubscriptionsService.updateDates(
        sub.tenantId,
        start ? new Date(start).toISOString() : null,
        end   ? new Date(end).toISOString()   : null,
      )
      onSaved({ ...sub, currentPeriodStart: updated.currentPeriodStart, currentPeriodEnd: updated.currentPeriodEnd })
      toast.success('Fechas actualizadas.')
      onClose()
    } catch { toast.error('Error al actualizar las fechas.') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <p className="font-semibold text-gray-900">Editar período de suscripción</p>
            <p className="text-xs text-gray-500 mt-0.5">{sub.tenant.name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Inicio del período</label>
            <input type="datetime-local" step="1" value={start} onChange={e => setStart(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Fin del período</label>
            <input type="datetime-local" step="1" value={end} onChange={e => setEnd(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 text-sm bg-slate-800 text-white rounded-xl hover:bg-slate-700 disabled:opacity-50 flex items-center gap-2 font-medium">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

const PAGE_SIZE_OPTIONS = [10, 20, 50]

export default function SysSubscriptionsPage() {
  const navigate = useNavigate()
  const [items,      setItems]      = useState<SysSubscription[]>([])
  const [total,      setTotal]      = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page,       setPage]       = useState(1)
  const [pageSize,   setPageSize]   = useState(20)
  const [loading,    setLoading]    = useState(true)
  const [plans,      setPlans]      = useState<SysPlan[]>([])
  const [changingId, setChangingId] = useState<string | null>(null)
  const [editSub,    setEditSub]    = useState<SysSubscription | null>(null)
  const [search,     setSearch]     = useState('')
  const [query,      setQuery]      = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSearchChange = (val: string) => {
    setSearch(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setQuery(val.trim())
      setPage(1)
    }, 400)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [subRes, planRes] = await Promise.all([
        sysSubscriptionsService.list(page, pageSize, query || undefined),
        sysPlansService.list(),
      ])
      setItems(subRes.items)
      setTotal(subRes.total)
      setTotalPages(subRes.totalPages)
      setPlans(planRes)
    } catch { toast.error('Error al cargar las suscripciones.') }
    finally { setLoading(false) }
  }, [page, pageSize, query])

  useEffect(() => { load() }, [load])

  const handleChangePlan = async (sub: SysSubscription, planId: string) => {
    setChangingId(sub.tenantId)
    try {
      const updated = await sysSubscriptionsService.changePlan(sub.tenantId, planId, sub.billingCycle as 'monthly' | 'annual')
      const newPlan = plans.find(p => p.id === planId)
      setItems(prev => prev.map(x => x.tenantId === sub.tenantId
        ? { ...x, planId: updated.planId, plan: newPlan ? { name: newPlan.name, priceMonthly: newPlan.priceMonthly } : x.plan }
        : x))
      toast.success('Plan actualizado.')
    } catch { toast.error('Error al cambiar el plan.') }
    finally { setChangingId(null) }
  }

  function runTour() {
    createTour([
      { element: '#tour-subs-header', title: 'Suscripciones',          description: 'Vista de todas las suscripciones activas en el sistema. Cada empresa tiene una suscripción que determina su plan y período de acceso.' },
      { element: '#tour-subs-search', title: 'Buscar suscripción',     description: 'Busca por nombre de empresa o nombre del plan. La búsqueda se realiza en el servidor.' },
      { element: '#tour-subs-table',  title: 'Tabla de suscripciones', description: 'Muestra el plan, estado, ciclo de facturación y período de cada empresa. Puedes cambiar el plan directamente con el selector, editar las fechas del período con el ícono de calendario o ver el historial de cambios.' },
    ]).drive()
  }

  return (
    <div className="space-y-5">
      {editSub && (
        <EditDatesModal
          sub={editSub}
          onClose={() => setEditSub(null)}
          onSaved={updated => setItems(prev => prev.map(x => x.tenantId === updated.tenantId ? updated : x))}
        />
      )}

      <div id="tour-subs-header">
        <h1 className="text-2xl font-bold text-gray-900">Suscripciones</h1>
        <p className="text-gray-500 text-sm mt-0.5">{total} suscripción{total !== 1 ? 'es' : ''} en el sistema</p>
        <div className="mt-1"><HelpButton onClick={runTour} /></div>
      </div>

      {/* Buscador */}
      <div id="tour-subs-search" className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Buscar empresa o plan..."
          value={search}
          onChange={e => handleSearchChange(e.target.value)}
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white"
        />
      </div>

      <div id="tour-subs-table" className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Empresa</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Plan</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Estado</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Ciclo</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Inicio período</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Fin período</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Cambiar plan</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.map(sub => {
                    const badge = STATUS_LABELS[sub.status] ?? STATUS_LABELS.canceled
                    return (
                      <tr key={sub.tenantId} className="hover:bg-gray-50/50">
                        <td className="px-5 py-3.5">
                          <p className="font-medium text-gray-900">{sub.tenant.name}</p>
                          <p className="text-xs text-gray-400">{sub.tenant.country}</p>
                        </td>
                        <td className="px-4 py-3.5 font-medium text-gray-800">{sub.plan.name}</td>
                        <td className="px-4 py-3.5">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                        </td>
                        <td className="px-4 py-3.5 text-gray-600">
                          {sub.billingCycle === 'annual' ? 'Anual' : 'Mensual'}
                        </td>
                        <td className="px-4 py-3.5 text-gray-600 text-xs whitespace-nowrap">
                          {fmtDateTime(sub.currentPeriodStart)}
                        </td>
                        <td className="px-4 py-3.5 text-gray-600 text-xs whitespace-nowrap">
                          {fmtDateTime(sub.currentPeriodEnd)}
                        </td>
                        <td className="px-4 py-3.5">
                          {changingId === sub.tenantId ? (
                            <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                          ) : (
                            <select
                              value={sub.planId}
                              onChange={e => handleChangePlan(sub, e.target.value)}
                              className="border border-gray-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white">
                              {plans.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1">
                            <button onClick={() => setEditSub(sub)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors" title="Editar fechas">
                              <CalendarDays className="w-4 h-4 text-slate-500" />
                            </button>
                            <button onClick={() => navigate(`/sys/subscriptions/${sub.tenantId}/history`)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors" title="Ver historial">
                              <History className="w-4 h-4 text-slate-500" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {items.length === 0 && (
                    <tr><td colSpan={8} className="px-5 py-10 text-center text-gray-400 text-sm">Sin suscripciones</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              totalPages={totalPages}
              totalCount={total}
              pageSize={pageSize}
              onPageChange={setPage}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageSizeChange={size => { setPageSize(size); setPage(1) }}
            />
          </>
        )}
      </div>
    </div>
  )
}
