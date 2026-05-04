import { useEffect, useState } from 'react'
import { Loader2, ChevronRight, ArrowLeft, Send, X, Tag, Clock, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { sysSupportService, type SysTicket, type SysTicketDetail } from '../sysService'
import { createTour } from '@/utils/tour'
import HelpButton from '@/components/HelpButton'
import { useSysAuthStore } from '@/store/sysAuthStore'
import Pagination from '@/components/Pagination'

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  open:    { label: 'Abierto',   color: 'bg-blue-50 text-blue-700 border-blue-200'    },
  pending: { label: 'Pendiente', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  closed:  { label: 'Cerrado',   color: 'bg-gray-100 text-gray-500 border-gray-200'   },
}

const PRIORITY_MAP: Record<string, { label: string; color: string }> = {
  low:    { label: 'Baja',    color: 'bg-gray-50 text-gray-500 border-gray-200'      },
  normal: { label: 'Normal',  color: 'bg-blue-50 text-blue-600 border-blue-200'      },
  high:   { label: 'Alta',    color: 'bg-orange-50 text-orange-600 border-orange-200'},
  urgent: { label: 'Urgente', color: 'bg-red-50 text-red-600 border-red-200'         },
}

const CATEGORY_LABELS: Record<string, string> = {
  general:   'General',
  billing:   'Facturación',
  technical: 'Técnico',
  other:     'Otro',
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? { label: status, color: 'bg-gray-100 text-gray-500 border-gray-200' }
  return <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${s.color}`}>{s.label}</span>
}

function PriorityBadge({ priority }: { priority: string }) {
  const p = PRIORITY_MAP[priority] ?? { label: priority, color: 'bg-gray-100 text-gray-500 border-gray-200' }
  return <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${p.color}`}>{p.label}</span>
}

function TicketDetail({ ticket: initial, onBack, onUpdated }: {
  ticket: SysTicket
  onBack: () => void
  onUpdated: (t: SysTicket) => void
}) {
  const [ticket,   setTicket]   = useState<SysTicketDetail | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [sseReady, setSseReady] = useState(false)
  const [reply,    setReply]    = useState('')
  const [sending,  setSending]  = useState(false)
  const [updatingStatus,   setUpdatingStatus]   = useState(false)
  const [updatingPriority, setUpdatingPriority] = useState(false)
  const { token } = useSysAuthStore()

  useEffect(() => {
    sysSupportService.get(initial.id)
      .then(t => { setTicket(t); setSseReady(true) })
      .catch(() => toast.error('Error al cargar el ticket.'))
      .finally(() => setLoading(false))
  }, [initial.id])

  useEffect(() => {
    if (!sseReady || !token) return
    const base = import.meta.env.VITE_API_URL ?? ''
    const es = new EventSource(`${base}/api/v1/admin/support/tickets/${initial.id}/events?token=${token}`)
    es.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data)
        if (payload.type === 'messages' && Array.isArray(payload.data)) {
          setTicket(t => t ? { ...t, messages: [...t.messages, ...payload.data] } : t)
        }
      } catch { /* ignore parse errors */ }
    }
    es.onerror = () => { es.close() }
    return () => { es.close() }
  }, [sseReady, initial.id, token])

  const handleReply = async () => {
    if (!reply.trim()) return
    setSending(true)
    try {
      await sysSupportService.reply(initial.id, reply.trim())
      setReply('')
    } catch { toast.error('Error al enviar respuesta.') }
    finally { setSending(false) }
  }

  const handleStatus = async (status: string) => {
    setUpdatingStatus(true)
    try {
      const updated = await sysSupportService.update(initial.id, { status })
      setTicket(t => t ? { ...t, status: updated.status, resolvedAt: updated.resolvedAt } : t)
      onUpdated(updated)
    } catch { toast.error('Error al actualizar.') }
    finally { setUpdatingStatus(false) }
  }

  const handlePriority = async (priority: string) => {
    setUpdatingPriority(true)
    try {
      const updated = await sysSupportService.update(initial.id, { priority })
      setTicket(t => t ? { ...t, priority: updated.priority } : t)
      onUpdated(updated)
    } catch { toast.error('Error al actualizar.') }
    finally { setUpdatingPriority(false) }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    )
  }

  if (!ticket) return null

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors mt-0.5">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-bold text-gray-900 truncate">{ticket.subject}</h2>
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            <span className="font-medium text-gray-700">Empresa - {ticket.tenant.name}</span>
            {' · '}
            {CATEGORY_LABELS[ticket.category] ?? ticket.category}
            {' · '}
            {new Date(ticket.createdAt).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Conversación */}
        <div className="lg:col-span-2 space-y-3">
          {/* Descripción inicial */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-400 mb-2">Descripción del problema</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
          </div>

          {/* Mensajes */}
          {ticket.messages.map(msg => (
            <div key={msg.id} className={`rounded-xl border p-4 ${msg.authorType === 'admin' ? 'bg-slate-50 border-slate-200' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-semibold ${msg.authorType === 'admin' ? 'text-slate-700' : 'text-blue-700'}`}>
                  {msg.authorType === 'admin' ? 'Soporte' : 'Empresa'}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(msg.createdAt).toLocaleString('es-EC', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{msg.body}</p>
            </div>
          ))}

          {/* Caja de respuesta */}
          {ticket.status !== 'closed' && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
              <p className="text-xs font-medium text-gray-500">Responder</p>
              <textarea
                rows={4}
                value={reply}
                onChange={e => setReply(e.target.value)}
                placeholder="Escribe tu respuesta..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 resize-none"
              />
              <div className="flex justify-end">
                <button
                  onClick={handleReply}
                  disabled={sending || !reply.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Enviar respuesta
                </button>
              </div>
            </div>
          )}

          {ticket.status === 'closed' && (
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-500">
              <CheckCircle2 className="w-4 h-4 text-gray-400" />
              Ticket cerrado
              {ticket.resolvedAt && ` · ${new Date(ticket.resolvedAt).toLocaleDateString('es-EC')}`}
            </div>
          )}
        </div>

        {/* Panel lateral */}
        <div className="space-y-4">
          {/* Estado */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <p className="text-xs font-medium text-gray-500 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" /> Estado</p>
            <div className="flex flex-col gap-1.5">
              {Object.entries(STATUS_MAP).map(([key, { label, color }]) => (
                <button key={key} onClick={() => handleStatus(key)}
                  disabled={updatingStatus || ticket.status === key}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors disabled:cursor-default
                    ${ticket.status === key ? `${color} font-semibold` : 'border-gray-100 text-gray-500 hover:bg-gray-50'}`}>
                  {updatingStatus && ticket.status !== key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  {label}
                  {ticket.status === key && <CheckCircle2 className="w-3.5 h-3.5 ml-auto" />}
                </button>
              ))}
            </div>
          </div>

          {/* Prioridad */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <p className="text-xs font-medium text-gray-500 flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" /> Prioridad</p>
            <div className="flex flex-col gap-1.5">
              {Object.entries(PRIORITY_MAP).map(([key, { label, color }]) => (
                <button key={key} onClick={() => handlePriority(key)}
                  disabled={updatingPriority || ticket.priority === key}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors disabled:cursor-default
                    ${ticket.priority === key ? `${color} font-semibold` : 'border-gray-100 text-gray-500 hover:bg-gray-50'}`}>
                  {label}
                  {ticket.priority === key && <CheckCircle2 className="w-3.5 h-3.5 ml-auto" />}
                </button>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
            <p className="text-xs font-medium text-gray-500 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Información</p>
            <div className="space-y-1.5 text-xs text-gray-500">
              <div className="flex justify-between">
                <span>Empresa</span>
                <span className="font-medium text-gray-700">{ticket.tenant.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Categoría</span>
                <span className="font-medium text-gray-700">{CATEGORY_LABELS[ticket.category] ?? ticket.category}</span>
              </div>
              <div className="flex justify-between">
                <span>Mensajes</span>
                <span className="font-medium text-gray-700">{ticket.messages.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Creado</span>
                <span className="font-medium text-gray-700">
                  {new Date(ticket.createdAt).toLocaleDateString('es-EC')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SysSupportPage() {
  const [tickets,  setTickets]  = useState<SysTicket[]>([])
  const [total,    setTotal]    = useState(0)
  const [loading,  setLoading]  = useState(true)
  const [selected, setSelected] = useState<SysTicket | null>(null)
  const [filterStatus,   setFilterStatus]   = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null])
  const [page,     setPage]     = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const totalPages = Math.ceil(total / pageSize)

  const fetchTickets = async (p: number, silent = false) => {
    if (!silent) setLoading(true)
    try {
      const [from, to] = dateRange
      const res = await sysSupportService.list({
        page: p, pageSize,
        status:   filterStatus   || undefined,
        priority: filterPriority || undefined,
        dateFrom: from ? from.toISOString().split('T')[0] : undefined,
        dateTo:   to   ? to.toISOString().split('T')[0]   : undefined,
      })
      setTickets(res.items)
      setTotal(res.total)
    } catch { if (!silent) toast.error('Error al cargar los tickets.') }
    finally { if (!silent) setLoading(false) }
  }

  const load = (p = page) => fetchTickets(p, false)

  useEffect(() => { fetchTickets(1, false); setPage(1) }, [filterStatus, filterPriority, dateRange])

  useEffect(() => {
    const interval = setInterval(() => fetchTickets(page, true), 15000)
    return () => clearInterval(interval)
  }, [page, filterStatus, filterPriority, dateRange])

  if (selected) {
    return (
      <TicketDetail
        ticket={selected}
        onBack={() => setSelected(null)}
        onUpdated={updated => {
          setTickets(ts => ts.map(t => t.id === updated.id ? { ...t, ...updated } : t))
          setSelected(s => s ? { ...s, ...updated } : s)
        }}
      />
    )
  }

  function runTour() {
    createTour([
      { element: '#tour-support-header',  title: 'Soporte preferencial',    description: 'Aquí ves todos los tickets abiertos por empresas con plan que incluye soporte preferencial (prioritySupport). Los tickets de mayor prioridad aparecen primero.' },
      { element: '#tour-support-filters', title: 'Filtros',                  description: 'Filtra por estado (abierto, pendiente, cerrado) o por prioridad (baja, normal, alta, urgente) para encontrar rápidamente lo que necesitas.' },
      { element: '#tour-support-table',   title: 'Lista de tickets',         description: 'Haz clic en cualquier fila para ver el detalle del ticket, leer el historial de mensajes y responder. El estado cambia automáticamente al responder.' },
    ]).drive()
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div id="tour-support-header" className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Soporte</h1>
          <p className="text-gray-500 text-sm mt-0.5">Tickets de empresas con soporte preferencial</p>
          <div className="mt-1"><HelpButton onClick={runTour} /></div>
        </div>
        <button onClick={() => load(page)}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <RefreshCw className="w-4 h-4" /> Actualizar
        </button>
      </div>

      {/* Filtros */}
      <div id="tour-support-filters" className="flex flex-wrap gap-3 items-center">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500">
          <option value="">Todos los estados</option>
          <option value="open">Abiertos</option>
          <option value="pending">Pendientes</option>
          <option value="closed">Cerrados</option>
        </select>
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500">
          <option value="">Todas las prioridades</option>
          <option value="urgent">Urgente</option>
          <option value="high">Alta</option>
          <option value="normal">Normal</option>
          <option value="low">Baja</option>
        </select>
        <DatePicker
          selectsRange
          startDate={dateRange[0]}
          endDate={dateRange[1]}
          onChange={(range) => setDateRange(range as [Date | null, Date | null])}
          placeholderText="Filtrar por fecha"
          dateFormat="dd/MM/yyyy"
          isClearable
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-500 w-52 text-gray-600"
          calendarClassName="text-sm"
        />
        {(filterStatus || filterPriority || dateRange[0]) && (
          <button onClick={() => { setFilterStatus(''); setFilterPriority(''); setDateRange([null, null]) }}
            className="flex items-center gap-1 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-3.5 h-3.5" /> Limpiar
          </button>
        )}
        <span className="ml-auto text-sm text-gray-400">{total} ticket{total !== 1 ? 's' : ''}</span>
      </div>

      {/* Tabla */}
      <div id="tour-support-table" className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
            <CheckCircle2 className="w-8 h-8" />
            <p className="text-sm">No hay tickets</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Asunto</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Empresa</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 hidden sm:table-cell">Categoría</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Estado</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 hidden md:table-cell">Prioridad</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 hidden lg:table-cell">Mensajes</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 hidden lg:table-cell">Fecha</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {tickets.map(ticket => (
                <tr key={ticket.id} onClick={() => setSelected(ticket)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900 max-w-48 truncate">{ticket.subject}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-36 truncate">{ticket.tenant.name}</td>
                  <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{CATEGORY_LABELS[ticket.category] ?? ticket.category}</td>
                  <td className="px-4 py-3"><StatusBadge status={ticket.status} /></td>
                  <td className="px-4 py-3 hidden md:table-cell"><PriorityBadge priority={ticket.priority} /></td>
                  <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">{ticket._count.messages}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs hidden lg:table-cell">
                    {new Date(ticket.updatedAt).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })}
                  </td>
                  <td className="px-4 py-3"><ChevronRight className="w-4 h-4 text-gray-300" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination
          page={page}
          totalPages={totalPages}
          totalCount={total}
          pageSize={pageSize}
          onPageChange={p => { setPage(p); fetchTickets(p) }}
          pageSizeOptions={[10, 20, 50]}
          onPageSizeChange={s => { setPageSize(s); setPage(1); fetchTickets(1) }}
        />
      </div>
    </div>
  )
}
