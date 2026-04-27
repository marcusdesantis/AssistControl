import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { sysSubscriptionsService, type SubscriptionLogEntry } from '../sysService'
import Pagination from '@/components/Pagination'

function fmtDateTime(d?: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleString('es-EC', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

const ACTION_LABELS: Record<string, { label: string; cls: string }> = {
  new:                 { label: 'Nueva suscripción',    cls: 'bg-emerald-50 text-emerald-700' },
  renewal:             { label: 'Renovación',           cls: 'bg-blue-50 text-blue-700'      },
  upgrade:             { label: 'Upgrade de plan',      cls: 'bg-purple-50 text-purple-700'  },
  cycle_change:        { label: 'Cambio de ciclo',      cls: 'bg-indigo-50 text-indigo-700'  },
  downgrade_scheduled: { label: 'Baja programada',      cls: 'bg-amber-50 text-amber-700'    },
  scheduled_downgrade: { label: 'Baja ejecutada',       cls: 'bg-orange-50 text-orange-700'  },
  auto_downgraded:     { label: 'Baja automática',      cls: 'bg-red-50 text-red-700'        },
  cancelled:           { label: 'Cancelación',          cls: 'bg-gray-100 text-gray-600'     },
}

const PAGE_SIZE_OPTIONS = [10, 20, 50]

export default function SysSubscriptionHistoryPage() {
  const { tenantId } = useParams<{ tenantId: string }>()
  const navigate = useNavigate()

  const [items,    setItems]    = useState<SubscriptionLogEntry[]>([])
  const [total,    setTotal]    = useState(0)
  const [loading,  setLoading]  = useState(true)
  const [page,     setPage]     = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [search,   setSearch]   = useState('')
  const [query,    setQuery]    = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const totalPages = Math.ceil(total / pageSize)

  const load = useCallback(async () => {
    if (!tenantId) return
    setLoading(true)
    try {
      const r = await sysSubscriptionsService.getHistory(tenantId, page, pageSize, query || undefined)
      setItems(r.items)
      setTotal(r.total)
    } catch { toast.error('Error al cargar el historial.') }
    finally { setLoading(false) }
  }, [tenantId, page, pageSize, query])

  useEffect(() => { load() }, [load])

  const handleSearch = () => {
    setQuery(search.trim())
    setPage(1)
  }

  const handleClear = () => {
    setSearch('')
    setQuery('')
    setPage(1)
    inputRef.current?.focus()
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/sys/subscriptions')}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          title="Volver">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Historial de suscripción</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {tenantId} · {total} registro{total !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Buscar plan anterior o nuevo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="pl-9 pr-8 py-2 border border-gray-300 rounded-xl text-sm w-72 focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white"
          />
          {search && (
            <button onClick={handleClear}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <button
          onClick={handleSearch}
          className="px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-medium hover:bg-slate-700 transition-colors">
          Buscar
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-12">Sin registros.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Fecha</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Acción</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Plan anterior</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Plan nuevo</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Ciclo</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">Pagado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.map(item => {
                    const a = ACTION_LABELS[item.action] ?? { label: item.action, cls: 'bg-gray-100 text-gray-600' }
                    return (
                      <tr key={item.id} className="hover:bg-gray-50/50">
                        <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDateTime(item.createdAt)}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${a.cls}`}>{a.label}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{item.previousPlanName ?? '—'}</td>
                        <td className="px-4 py-3 font-medium text-gray-800 text-xs">{item.plan.name}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{item.billingCycle === 'annual' ? 'Anual' : 'Mensual'}</td>
                        <td className="px-5 py-3 text-right text-xs font-medium text-gray-700">
                          {item.amountPaid != null ? `$${item.amountPaid.toFixed(2)}` : '—'}
                          {item.creditAmount ? <span className="text-emerald-600 ml-1">(−${item.creditAmount.toFixed(2)})</span> : null}
                        </td>
                      </tr>
                    )
                  })}
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
