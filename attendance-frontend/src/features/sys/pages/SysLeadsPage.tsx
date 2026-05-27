import { useState, useEffect } from 'react'
import { sysApi } from '@/services/sysApi'
import { MessageCircle, Filter, Calendar, Monitor, Smartphone, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import Pagination from '@/components/Pagination'

interface LeadEvent {
  id:        string
  page:      string
  option:    string | null
  device:    string | null
  ip:        string | null
  createdAt: string
}

interface ApiResponse { success: boolean; data?: { items: LeadEvent[]; total: number; page: number; pageSize: number } }

const PAGE_LABELS: Record<string, string> = {
  'home':                'Inicio',
  'control-asistencia':  'Control de Asistencia',
  'asistencia-laboral':  'Asistencia Laboral',
  'huella-biometrica':   'Huella Biométrica',
}

const PAGE_COLORS: Record<string, string> = {
  'home':                'bg-blue-50 text-blue-700 border-blue-200',
  'control-asistencia':  'bg-purple-50 text-purple-700 border-purple-200',
  'asistencia-laboral':  'bg-orange-50 text-orange-700 border-orange-200',
  'huella-biometrica':   'bg-emerald-50 text-emerald-700 border-emerald-200',
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function SysLeadsPage() {
  const [items,      setItems]      = useState<LeadEvent[]>([])
  const [total,      setTotal]      = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page,       setPage]       = useState(1)
  const [pageSize,   setPageSize]   = useState(20)
  const [loading,    setLoading]    = useState(false)
  const [pageFilter, setPageFilter] = useState('')
  const [from,       setFrom]       = useState('')
  const [to,         setTo]         = useState('')

  const PAGE_SIZE_OPTIONS = [10, 20, 50]

  useEffect(() => { load() }, [page, pageFilter, from, to])

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
      if (pageFilter) params.set('page_filter', pageFilter)
      if (from)       params.set('from', from)
      if (to)         params.set('to', to)
      const res = await sysApi.get<ApiResponse>(`/leads?${params}`)
      const d = res.data.data
      setItems(d?.items ?? [])
      setTotal(d?.total ?? 0)
      setTotalPages(Math.ceil((d?.total ?? 0) / pageSize) || 1)
    } catch { toast.error('Error al cargar solicitudes') }
    finally { setLoading(false) }
  }

  function resetFilters() {
    setPageFilter(''); setFrom(''); setTo(''); setPage(1)
  }

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Consultas por WhatsApp</h1>
          <p className="text-sm text-gray-500 mt-0.5">Visitantes que contactaron desde el landing</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 flex items-center gap-1"><Filter className="w-3 h-3" />Página</label>
          <select value={pageFilter} onChange={e => { setPageFilter(e.target.value); setPage(1) }}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white">
            <option value="">Todas</option>
            {Object.entries(PAGE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 flex items-center gap-1"><Calendar className="w-3 h-3" />Desde</label>
          <input type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1) }}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Hasta</label>
          <input type="date" value={to} onChange={e => { setTo(e.target.value); setPage(1) }}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300" />
        </div>
        {(pageFilter || from || to) && (
          <button onClick={resetFilters} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50">
            Limpiar filtros
          </button>
        )}
        <div className="ml-auto text-sm text-gray-400 self-end pb-2">{total} resultado{total !== 1 ? 's' : ''}</div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" />Cargando…
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
            <MessageCircle className="w-10 h-10 opacity-30" />
            <p className="text-sm">Aún no hay solicitudes de contacto</p>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Página</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Consulta</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Dispositivo</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(item.createdAt)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${PAGE_COLORS[item.page] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                          {PAGE_LABELS[item.page] ?? item.page}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700 max-w-xs truncate">{item.option ?? <span className="text-gray-400 italic">—</span>}</td>
                      <td className="px-4 py-3">
                        {item.device === 'mobile'
                          ? <span className="flex items-center gap-1 text-gray-500"><Smartphone className="w-3.5 h-3.5" />Móvil</span>
                          : <span className="flex items-center gap-1 text-gray-500"><Monitor className="w-3.5 h-3.5" />Desktop</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-400 font-mono text-xs">{item.ip ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {items.map(item => (
                <div key={item.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${PAGE_COLORS[item.page] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                      {PAGE_LABELS[item.page] ?? item.page}
                    </span>
                    <span className="text-xs text-gray-400">{fmtDate(item.createdAt)}</span>
                  </div>
                  <p className="text-sm text-gray-700">{item.option ?? <span className="text-gray-400 italic">Sin mensaje</span>}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    {item.device === 'mobile' ? <><Smartphone className="w-3 h-3" />Móvil</> : <><Monitor className="w-3 h-3" />Desktop</>}
                    {item.ip && <span className="font-mono">{item.ip}</span>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        <Pagination
          page={page}
          totalPages={totalPages}
          totalCount={total}
          pageSize={pageSize}
          onPageChange={setPage}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onPageSizeChange={size => { setPageSize(size); setPage(1) }}
        />
      </div>
    </div>
  )
}
