import { useState, useEffect, useRef } from 'react'
import { Bell, Check, Loader2, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/services/api'
import { sysApi } from '@/services/sysApi'
import type { AxiosInstance } from 'axios'

interface Notification {
  id: string
  title: string
  body: string
  type: string
  isRead: boolean
  createdAt: string
}

interface ApiResp { success: boolean; data?: { items: Notification[]; unread: number } }

const TYPE_DOT: Record<string, string> = {
  info:    'bg-blue-400',
  success: 'bg-emerald-400',
  warning: 'bg-amber-400',
  error:   'bg-red-400',
}

const TYPE_BADGE: Record<string, string> = {
  info:    'bg-blue-50 text-blue-700 border-blue-200',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  error:   'bg-red-50 text-red-700 border-red-200',
}

const TYPE_LABEL: Record<string, string> = {
  info: 'Información', success: 'Éxito', warning: 'Advertencia', error: 'Alerta',
}

const TYPE_ICON_COLOR: Record<string, string> = {
  info: 'text-blue-500', success: 'text-emerald-500', warning: 'text-amber-500', error: 'text-red-500',
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'Ahora'
  if (m < 60) return `Hace ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `Hace ${h} h`
  return `Hace ${Math.floor(h / 24)} d`
}

function NotificationModal({ notification, onClose, onMarkRead }: {
  notification: Notification
  onClose: () => void
  onMarkRead: () => void
}) {
  const badgeCls  = TYPE_BADGE[notification.type]  ?? TYPE_BADGE.info
  const iconColor = TYPE_ICON_COLOR[notification.type] ?? TYPE_ICON_COLOR.info
  const label     = TYPE_LABEL[notification.type]  ?? 'Notificación'

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Colored top bar */}
        <div className={`h-1.5 w-full ${TYPE_DOT[notification.type] ?? TYPE_DOT.info}`} />

        <div className="px-6 pt-5 pb-6">
          {/* Header row */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Bell className={`w-5 h-5 shrink-0 ${iconColor}`} />
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${badgeCls}`}>
                {label}
              </span>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors mt-0.5">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <h3 className="text-base font-semibold text-gray-900 mb-2">{notification.title}</h3>
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{notification.body}</p>
          <p className="text-xs text-gray-400 mt-3">{timeAgo(notification.createdAt)}</p>

          {/* Actions */}
          <div className="flex gap-3 mt-5">
            <button onClick={onClose}
              className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              Cerrar
            </button>
            <button onClick={onMarkRead}
              className="flex-1 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-900 flex items-center justify-center gap-1.5 transition-colors">
              <Check className="w-3.5 h-3.5" /> Marcar como leída
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function NotificationBell({ endpoint = '/notifications', variant = 'tenant' }: { endpoint?: string; variant?: 'tenant' | 'sys' }) {
  const client: AxiosInstance = variant === 'sys' ? sysApi : api
  const navigate = useNavigate()
  const [open,        setOpen]        = useState(false)
  const [items,       setItems]       = useState<Notification[]>([])
  const [unread,      setUnread]      = useState(0)
  const [loading,     setLoading]     = useState(false)
  const [markingRead, setMarkingRead] = useState(false)
  const [modal,       setModal]       = useState<Notification | null>(null)
  const ref          = useRef<HTMLDivElement>(null)
  const prevUnread   = useRef<number | null>(null)
  const shownIds     = useRef<Set<string>>(new Set())

  const load = async (isFirst = false) => {
    if (!isFirst) setLoading(false)
    try {
      const res = await client.get<ApiResp>(endpoint)
      const newItems  = res.data.data?.items ?? []
      const newUnread = res.data.data?.unread ?? 0

      setItems(newItems)
      setUnread(newUnread)

      // Show modal for new unread notifications (tenant only, not on first load if no modal is open)
      if (variant === 'tenant' && prevUnread.current !== null && newUnread > prevUnread.current) {
        const latest = newItems.find(n => !n.isRead && !shownIds.current.has(n.id))
        if (latest) {
          shownIds.current.add(latest.id)
          setModal(latest)
        }
      }

      prevUnread.current = newUnread
    } catch { /* silencioso */ }
  }

  useEffect(() => {
    load(true)
    const interval = setInterval(() => load(), 30_000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    const refresh = () => load()
    window.addEventListener('notifications:refresh', refresh)
    return () => window.removeEventListener('notifications:refresh', refresh)
  }, [])

  const markAllRead = async () => {
    if (unread === 0) return
    setMarkingRead(true)
    try {
      await client.patch(endpoint)
      setItems(p => p.map(n => ({ ...n, isRead: true })))
      setUnread(0)
      prevUnread.current = 0
    } catch { /* silencioso */ }
    finally { setMarkingRead(false) }
  }

  const handleModalMarkRead = async () => {
    if (!modal) return
    try {
      await client.patch(`${endpoint}?id=${modal.id}`)
      setItems(p => p.map(n => n.id === modal.id ? { ...n, isRead: true } : n))
      setUnread(p => Math.max(0, p - 1))
      prevUnread.current = Math.max(0, (prevUnread.current ?? 1) - 1)
    } catch { /* silencioso */ }
    setModal(null)
  }

  return (
    <>
      {modal && (
        <NotificationModal
          notification={modal}
          onClose={() => setModal(null)}
          onMarkRead={handleModalMarkRead}
        />
      )}

      <div ref={ref} className="relative">
        <button onClick={() => setOpen(o => !o)}
          className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700">
          <Bell className="w-5 h-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900">Notificaciones</p>
              {unread > 0 && (
                <button onClick={markAllRead} disabled={markingRead}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors">
                  {markingRead
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <Check className="w-3 h-3" />}
                  Marcar todo como leído
                </button>
              )}
            </div>

            <div className="divide-y divide-gray-50">
              {loading && items.length === 0 ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                </div>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <Bell className="w-8 h-8 text-gray-200" />
                  <p className="text-xs text-gray-400">Sin notificaciones</p>
                </div>
              ) : (
                items.slice(0, 3).map(n => (
                  <div key={n.id}
                    className={`flex gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${!n.isRead ? 'bg-blue-50/40' : ''}`}>
                    <div className="mt-1.5 shrink-0">
                      <span className={`w-2 h-2 rounded-full block ${!n.isRead ? (TYPE_DOT[n.type] ?? TYPE_DOT.info) : 'bg-gray-200'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-tight ${!n.isRead ? 'font-medium text-gray-900' : 'text-gray-700'}`}>{n.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">{n.body}</p>
                      <p className="text-[11px] text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            {items.length > 0 && (
              <div className="border-t border-gray-100">
                <button
                  onClick={() => { setOpen(false); navigate(variant === 'sys' ? '/sys/notifications' : '/notifications') }}
                  className="w-full py-2.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-gray-50 transition-colors">
                  Ver todas las notificaciones
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
