import { useEffect, useState } from 'react'
import { Loader2, MessageSquare, Plus, ArrowLeft, Send, CheckCircle2, Phone, Mail, ChevronRight, X } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/authStore'
import { supportService, type Ticket, type TicketDetail, type SupportInfo } from './supportService'
import { createTour } from '@/utils/tour'
import HelpButton from '@/components/HelpButton'

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  open:    { label: 'Abierto',   color: 'bg-blue-50 text-blue-700 border-blue-200'    },
  pending: { label: 'Pendiente', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  closed:  { label: 'Cerrado',   color: 'bg-gray-100 text-gray-500 border-gray-200'   },
}

const CATEGORY_OPTIONS = [
  { value: 'general',   label: 'General'      },
  { value: 'billing',   label: 'Facturación'  },
  { value: 'technical', label: 'Técnico'      },
  { value: 'other',     label: 'Otro'         },
]

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? { label: status, color: 'bg-gray-100 text-gray-500 border-gray-200' }
  return <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${s.color}`}>{s.label}</span>
}

function ContactCard({ info }: { info: SupportInfo }) {
  if (!info.whatsapp && !info.phone && !info.email) return null
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
      <p className="text-sm font-semibold text-gray-800">Contacto de soporte</p>
      {info.whatsapp && !info.phone && (
        <a href={`https://wa.me/${info.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-3 p-3 rounded-lg border border-green-200 bg-green-50 hover:bg-green-100 transition-colors">
          <Phone className="w-4 h-4 text-green-600 shrink-0" />
          <div>
            <p className="text-xs font-medium text-green-800">WhatsApp</p>
            <p className="text-sm text-green-700">{info.whatsapp}</p>
          </div>
        </a>
      )}
      {info.phone && (
        <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50">
          <Phone className="w-4 h-4 text-gray-500 shrink-0" />
          <div>
            <p className="text-xs font-medium text-gray-600">Teléfono</p>
            <p className="text-sm text-gray-700">{info.phone}</p>
          </div>
        </div>
      )}
      {info.email && (
        <a href={`mailto:${info.email}`}
          className="flex items-center gap-3 p-3 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors">
          <Mail className="w-4 h-4 text-blue-600 shrink-0" />
          <div>
            <p className="text-xs font-medium text-blue-800">Correo</p>
            <p className="text-sm text-blue-700">{info.email}</p>
          </div>
        </a>
      )}
    </div>
  )
}

function NewTicketForm({ onCreated, onCancel }: { onCreated: (t: Ticket) => void; onCancel: () => void }) {
  const [form, setForm] = useState({ subject: '', description: '', category: 'general' })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (form.subject.trim().length < 5) {
      toast.error('El asunto debe tener al menos 5 caracteres.')
      return
    }
    if (form.description.trim().length < 10) {
      toast.error('La descripción debe tener al menos 10 caracteres.')
      return
    }
    setSaving(true)
    try {
      const ticket = await supportService.create(form)
      toast.success('Ticket creado correctamente.')
      onCreated(ticket)
    } catch { toast.error('Error al crear el ticket.') }
    finally { setSaving(false) }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-800">Nuevo ticket</p>
        <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-500 block mb-1">Asunto</label>
        <input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
          placeholder="Describe brevemente el problema"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
      </div>

      <div>
        <label className="text-xs font-medium text-gray-500 block mb-1">Categoría</label>
        <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500">
          {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-500 block mb-1">Descripción</label>
        <textarea rows={5} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
          placeholder="Describe el problema con el mayor detalle posible..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 resize-none" />
      </div>

      <div className="flex gap-2">
        <button onClick={onCancel}
          className="flex-1 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
          Cancelar
        </button>
        <button onClick={handleSubmit} disabled={saving}
          className="flex-1 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Enviar
        </button>
      </div>
    </div>
  )
}

function TicketView({ ticket: initial, onBack }: { ticket: Ticket; onBack: () => void }) {
  const [ticket,   setTicket]   = useState<TicketDetail | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [sseReady, setSseReady] = useState(false)
  const [reply,    setReply]    = useState('')
  const [sending,  setSending]  = useState(false)
  const { accessToken } = useAuthStore()

  useEffect(() => {
    supportService.get(initial.id)
      .then(t => { setTicket(t); setSseReady(true) })
      .catch(() => toast.error('Error al cargar el ticket.'))
      .finally(() => setLoading(false))
  }, [initial.id])

  useEffect(() => {
    if (!sseReady || !accessToken) return
    const base = import.meta.env.VITE_API_URL ?? ''
    const es = new EventSource(`${base}/api/v1/support/tickets/${initial.id}/events?token=${accessToken}`)
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
  }, [sseReady, initial.id, accessToken])

  const handleReply = async () => {
    if (!reply.trim()) return
    setSending(true)
    try {
      await supportService.reply(initial.id, reply.trim())
      setReply('')
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Error al enviar.')
    } finally { setSending(false) }
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
  if (!ticket) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-bold text-gray-900 truncate">{ticket.subject}</h2>
            <StatusBadge status={ticket.status} />
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {CATEGORY_OPTIONS.find(o => o.value === ticket.category)?.label ?? ticket.category}
            {' · '}{new Date(ticket.createdAt).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Descripción */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-xs font-medium text-gray-400 mb-2">Tu consulta</p>
        <p className="text-sm text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
      </div>

      {/* Mensajes */}
      {ticket.messages.map(msg => (
        <div key={msg.id} className={`rounded-xl border p-4 ${msg.authorType === 'admin' ? 'bg-slate-50 border-slate-200' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs font-semibold ${msg.authorType === 'admin' ? 'text-slate-700' : 'text-blue-700'}`}>
              {msg.authorType === 'admin' ? 'Soporte' : 'Tú'}
            </span>
            <span className="text-xs text-gray-400">
              {new Date(msg.createdAt).toLocaleString('es-EC', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{msg.body}</p>
        </div>
      ))}

      {ticket.status !== 'closed' ? (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <textarea rows={3} value={reply} onChange={e => setReply(e.target.value)}
            placeholder="Escribe tu respuesta..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 resize-none" />
          <div className="flex justify-end">
            <button onClick={handleReply} disabled={sending || !reply.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Responder
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-500">
          <CheckCircle2 className="w-4 h-4 text-gray-400" /> Ticket cerrado
        </div>
      )}
    </div>
  )
}

export default function SupportPage() {
  const { capabilities } = useAuthStore()
  const hasPrioritySupport = capabilities?.prioritySupport?.enabled === true

  const [info,     setInfo]     = useState<SupportInfo | null>(null)
  const [tickets,  setTickets]  = useState<Ticket[]>([])
  const [loading,  setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState<Ticket | null>(null)

  useEffect(() => {
    const promises: Promise<void>[] = [
      supportService.info().then(setInfo).catch(() => {}),
    ]
    if (hasPrioritySupport) {
      promises.push(supportService.list().then(setTickets).catch(() => {}))
    }
    Promise.all(promises).finally(() => setLoading(false))
  }, [hasPrioritySupport])

  useEffect(() => {
    if (!hasPrioritySupport || selected) return
    const interval = setInterval(() => {
      supportService.list().then(setTickets).catch(() => {})
    }, 10000)
    return () => clearInterval(interval)
  }, [hasPrioritySupport, selected])

  if (loading) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
  }

  if (selected) {
    return <TicketView ticket={selected} onBack={() => setSelected(null)} />
  }

  function runTour() {
    createTour([
      { element: '#tour-support-header',  title: 'Soporte',             description: 'Aquí puedes contactar con el equipo de soporte y, si tu plan lo incluye, abrir tickets para dar seguimiento a tus consultas.' },
      { element: '#tour-support-contact', title: 'Datos de contacto',   description: 'Canales directos de soporte: WhatsApp y correo electrónico. Disponibles siempre, independientemente de tu plan.' },
      { element: '#tour-support-tickets', title: 'Tickets de soporte',  description: 'Con el plan de soporte preferencial puedes crear tickets y recibir respuestas del equipo con seguimiento completo del historial de mensajes.' },
    ]).drive()
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div id="tour-support-header" className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Soporte</h1>
          <p className="text-gray-500 text-sm mt-0.5">Contacta con soporte</p>
          <div className="mt-1"><HelpButton onClick={runTour} /></div>
        </div>
        {hasPrioritySupport && !showForm && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-900 transition-colors">
            <Plus className="w-4 h-4" /> Nuevo ticket
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        <div className="lg:col-span-2 space-y-4">

          {/* Formulario nuevo ticket */}
          {showForm && (
            <NewTicketForm
              onCreated={t => { setTickets(ts => [t, ...ts]); setShowForm(false) }}
              onCancel={() => setShowForm(false)}
            />
          )}

          <div id="tour-support-tickets">
          {hasPrioritySupport ? (
            <>
              {/* Lista de tickets */}

              {tickets.length === 0 && !showForm ? (
                <div className="bg-white rounded-xl border border-gray-200 flex flex-col items-center justify-center py-12 gap-2 text-gray-400">
                  <MessageSquare className="w-8 h-8" />
                  <p className="text-sm">No tienes tickets abiertos</p>
                  <button onClick={() => setShowForm(true)}
                    className="mt-2 flex items-center gap-1 text-sm text-slate-700 hover:underline font-medium">
                    <Plus className="w-3.5 h-3.5" /> Crear primer ticket
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="divide-y divide-gray-50">
                    {tickets.map(ticket => (
                      <button key={ticket.id} onClick={() => setSelected(ticket)}
                        className="w-full text-left flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-gray-900 truncate">{ticket.subject}</p>
                            <StatusBadge status={ticket.status} />
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {CATEGORY_OPTIONS.find(o => o.value === ticket.category)?.label}
                            {' · '}{ticket._count.messages} mensaje{ticket._count.messages !== 1 ? 's' : ''}
                            {' · '}{new Date(ticket.updatedAt).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Sin soporte preferencial */
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center space-y-3">
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto">
                <MessageSquare className="w-6 h-6 text-slate-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Soporte preferencial no disponible</p>
                <p className="text-xs text-gray-500 mt-1">
                  Tu plan actual no incluye tickets de soporte. Usa los datos de contacto para comunicarte con nosotros.
                </p>
              </div>
            </div>
          )}
          </div>{/* /tour-support-tickets */}
        </div>

        {/* Panel lateral: info de contacto */}
        <div id="tour-support-contact">
          {info && <ContactCard info={info} />}
        </div>
      </div>
    </div>
  )
}
