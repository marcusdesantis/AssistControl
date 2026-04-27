import { useEffect, useState, useCallback, useRef } from 'react'
import { Bell, Check, Loader2, Search, X } from 'lucide-react'
import { api } from '@/services/api'
import { sysApi } from '@/services/sysApi'
import { toast } from 'sonner'
import type { AxiosInstance } from 'axios'
import Pagination from '@/components/Pagination'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

interface Notification {
  id: string; title: string; body: string; type: string; isRead: boolean; createdAt: string
}

const TYPE_DOT: Record<string, string> = {
  info:    'bg-blue-400',
  success: 'bg-emerald-400',
  warning: 'bg-amber-400',
  error:   'bg-red-400',
}

const TYPE_BADGE: Record<string, string> = {
  info:    'bg-blue-50 text-blue-700',
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-700',
  error:   'bg-red-50 text-red-700',
}

const TYPE_LABEL: Record<string, string> = {
  info: 'Información', success: 'Éxito', warning: 'Advertencia', error: 'Alerta',
}

const TYPE_FILTERS = [
  { value: '',        label: 'Todos' },
  { value: 'info',    label: 'Información' },
  { value: 'success', label: 'Éxito' },
  { value: 'warning', label: 'Advertencia' },
  { value: 'error',   label: 'Alerta' },
]

const PAGE_SIZE_OPTIONS = [10, 20, 50]

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'Ahora'
  if (m < 60) return `Hace ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `Hace ${h} h`
  const d = Math.floor(h / 24)
  if (d < 30) return `Hace ${d} d`
  return new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function NotificationsPage({ variant = 'tenant' }: { variant?: 'tenant' | 'sys' }) {
  const client: AxiosInstance = variant === 'sys' ? sysApi : api
  const [items,      setItems]      = useState<Notification[]>([])
  const [total,      setTotal]      = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [unread,     setUnread]     = useState(0)
  const [page,       setPage]       = useState(1)
  const [pageSize,   setPageSize]   = useState(20)
  const [typeFilter,   setTypeFilter]   = useState('')
  const [searchInput,  setSearchInput]  = useState('')
  const [search,       setSearch]       = useState('')
  const [dateRange,    setDateRange]    = useState<[Date | null, Date | null]>([null, null])
  const [loading,    setLoading]    = useState(true)
  const [marking,    setMarking]    = useState(false)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dateTimeout   = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { page, pageSize }
      if (typeFilter)      params.type     = typeFilter
      if (search)          params.search   = search
      if (dateRange[0])    params.dateFrom = dateRange[0].toISOString().slice(0, 10)
      if (dateRange[1])    params.dateTo   = dateRange[1].toISOString().slice(0, 10)
      const res = await client.get('/notifications', { params })
      const d = res.data.data
      setItems(d.items)
      setTotal(d.total)
      setTotalPages(d.totalPages)
      setUnread(d.unread)
    } catch { toast.error('Error al cargar las notificaciones.') }
    finally { setLoading(false) }
  }, [page, pageSize, typeFilter, search, dateRange])

  useEffect(() => { load() }, [load])

  const resetPage = () => setPage(1)

  const changeType = (t: string) => { setTypeFilter(t); resetPage() }
  const changePageSize = (s: number) => { setPageSize(s); resetPage() }

  const handleSearch = (val: string) => {
    setSearchInput(val)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => { setSearch(val); setPage(1) }, 400)
  }

  const handleDateRange = (range: [Date | null, Date | null]) => {
    setDateRange(range)
    if (dateTimeout.current) clearTimeout(dateTimeout.current)
    if (range[0] && range[1]) dateTimeout.current = setTimeout(resetPage, 300)
  }

  const clearFilters = () => {
    setSearchInput(''); setSearch(''); setDateRange([null, null]); setTypeFilter(''); resetPage()
  }

  const hasFilters = !!(search || dateRange[0] || typeFilter)

  const markAllRead = async () => {
    if (unread === 0) return
    setMarking(true)
    try {
      await client.patch('/notifications')
      setItems(p => p.map(n => ({ ...n, isRead: true })))
      setUnread(0)
      window.dispatchEvent(new CustomEvent('notifications:refresh'))
      toast.success('Todas marcadas como leídas.')
    } catch { toast.error('Error al marcar como leídas.') }
    finally { setMarking(false) }
  }

  const markOneRead = async (id: string) => {
    try {
      await client.patch(`/notifications?id=${id}`)
      setItems(p => p.map(n => n.id === id ? { ...n, isRead: true } : n))
      setUnread(p => Math.max(0, p - 1))
      window.dispatchEvent(new CustomEvent('notifications:refresh'))
    } catch { toast.error('Error al marcar la notificación.') }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notificaciones</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {total} notificación{total !== 1 ? 'es' : ''}
            {unread > 0 && <span className="ml-2 text-red-500 font-medium">· {unread} sin leer</span>}
          </p>
        </div>
        <button onClick={markAllRead} disabled={marking || unread === 0}
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors">
          {marking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Marcar todo como leído
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Filtros por tipo — izquierda */}
        <div className="flex gap-2 flex-wrap flex-1">
          {TYPE_FILTERS.map(f => (
            <button key={f.value} onClick={() => changeType(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                typeFilter === f.value
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Búsqueda + fechas — derecha */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Buscar por título */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Buscar por título..."
              className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-300 w-44"
            />
          </div>

          {/* Rango de fechas */}
          <DatePicker
            selectsRange
            startDate={dateRange[0]}
            endDate={dateRange[1]}
            onChange={handleDateRange}
            placeholderText="Filtrar por fecha"
            dateFormat="dd/MM/yyyy"
            isClearable
            className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-300 w-44 text-gray-600"
            calendarClassName="text-sm"
          />

          {/* Limpiar filtros */}
          {hasFilters && (
            <button onClick={clearFilters}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <X className="w-3 h-3" /> Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Lista */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Bell className="w-10 h-10 text-gray-200" />
            <p className="text-sm text-gray-400">No hay notificaciones{hasFilters ? ' con estos filtros' : ''}</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-100">
              {items.map(n => (
                <div key={n.id}
                  onClick={() => !n.isRead && markOneRead(n.id)}
                  className={`flex gap-4 px-6 py-4 transition-colors ${!n.isRead ? 'bg-blue-50/30 hover:bg-blue-50/60 cursor-pointer' : 'hover:bg-gray-50/50'}`}>
                  <div className="mt-2 shrink-0">
                    <span className={`w-2.5 h-2.5 rounded-full block ${!n.isRead ? (TYPE_DOT[n.type] ?? TYPE_DOT.info) : 'bg-gray-200'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className={`text-sm ${!n.isRead ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                        {n.title}
                      </p>
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${TYPE_BADGE[n.type] ?? TYPE_BADGE.info}`}>
                        {TYPE_LABEL[n.type] ?? n.type}
                      </span>
                      {!n.isRead && (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-600">Nueva</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line">{n.body}</p>
                    <p className="text-xs text-gray-400 mt-1.5">{timeAgo(n.createdAt)}</p>
                  </div>
                  <div className="shrink-0 mt-1 flex items-center">
                    {!n.isRead
                      ? <span title="Clic para marcar como leída"><Check className="w-4 h-4 text-blue-400" /></span>
                      : <span className="flex" title="Leída"><Check className="w-4 h-4 text-emerald-400" /><Check className="w-4 h-4 text-emerald-400 -ml-2.5" /></span>
                    }
                  </div>
                </div>
              ))}
            </div>
            <Pagination
              page={page}
              totalPages={totalPages}
              totalCount={total}
              pageSize={pageSize}
              onPageChange={setPage}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageSizeChange={changePageSize}
            />
          </>
        )}
      </div>
    </div>
  )
}
