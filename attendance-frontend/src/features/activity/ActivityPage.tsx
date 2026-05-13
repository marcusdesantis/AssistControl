import { useState, useEffect, useCallback } from 'react'
import { Activity, Search, Filter, RefreshCw, Monitor, Smartphone } from 'lucide-react'
import { activityService, labelAction, labelModule } from './activityService'
import type { AuditLog } from './activityService'

const MODULES = ['auth', 'employees', 'attendance', 'schedules', 'messages', 'mobile']

const MODULE_COLORS: Record<string, string> = {
  auth:       'bg-slate-100 text-slate-700',
  employees:  'bg-blue-100 text-blue-700',
  attendance: 'bg-green-100 text-green-700',
  schedules:  'bg-purple-100 text-purple-700',
  messages:   'bg-amber-100 text-amber-700',
  mobile:     'bg-cyan-100 text-cyan-700',
}

export default function ActivityPage() {
  const [logs, setLogs]       = useState<AuditLog[]>([])
  const [total, setTotal]     = useState(0)
  const [page, setPage]       = useState(1)
  const [loading, setLoading] = useState(false)
  const [search, setSearch]   = useState('')
  const [module, setModule]   = useState('')
  const PAGE_SIZE = 50

  const load = useCallback(async (p = page) => {
    setLoading(true)
    try {
      const res = await activityService.getLogs({ page: p, pageSize: PAGE_SIZE, module: module || undefined, search: search || undefined })
      setLogs(res.items)
      setTotal(res.total)
    } catch { } finally { setLoading(false) }
  }, [page, module, search])

  useEffect(() => { setPage(1); load(1) }, [module, search])
  useEffect(() => { load() }, [page])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Actividad</h1>
        <p className="text-gray-500 text-sm mt-0.5">Registro de acciones realizadas en el sistema (últimos 30 días)</p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por usuario o acción…"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select
            value={module}
            onChange={e => setModule(e.target.value)}
            className="pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          >
            <option value="">Todos los módulos</option>
            {MODULES.map(m => <option key={m} value={m}>{labelModule(m)}</option>)}
          </select>
        </div>
        <button onClick={() => load()} disabled={loading}
          className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Usuario</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Módulo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Acción</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Origen</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && logs.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">Cargando…</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">
                  <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No hay registros de actividad
                </td></tr>
              ) : logs.map(log => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800">{log.userName ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${MODULE_COLORS[log.module] ?? 'bg-gray-100 text-gray-700'}`}>
                      {labelModule(log.module)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{labelAction(log.action)}</td>
                  <td className="px-4 py-3">
                    {log.source === 'mobile'
                      ? <span className="flex items-center gap-1 text-cyan-600"><Smartphone className="w-3.5 h-3.5" />Móvil</span>
                      : <span className="flex items-center gap-1 text-gray-500"><Monitor className="w-3.5 h-3.5" />Web</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs font-mono">{log.ip ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
            <span>{total} registros</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40">Anterior</button>
              <span className="px-3 py-1">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-3 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40">Siguiente</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
