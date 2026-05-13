import { useState, useEffect, useCallback } from 'react'
import { FileText, ChevronRight, ArrowLeft, Download, Activity, Monitor, Smartphone, Search, Database, Archive } from 'lucide-react'
import { sysApi } from '@/services/sysApi'
import Pagination from '@/components/Pagination'

interface TenantRow  { id: string; name: string }
interface BackupFile { month: string; filename: string; sizeKb: number }
interface AuditLog   { id: string; userName?: string; action: string; module: string; detail?: string; ip?: string; source: string; createdAt: string }

const ACTION_LABELS: Record<string, string> = {
  'auth.login': 'Inicio de sesión', 'auth.logout': 'Cierre de sesión', 'auth.change_password': 'Cambio de contraseña',
  'employee.create': 'Empleado creado', 'employee.update': 'Empleado editado', 'employee.delete': 'Empleado eliminado',
  'attendance.update': 'Asistencia editada', 'attendance.delete': 'Asistencia eliminada',
  'schedule.create': 'Horario creado', 'schedule.update': 'Horario editado', 'schedule.delete': 'Horario eliminado',
  'message.send': 'Mensaje enviado', 'message.update': 'Mensaje editado', 'message.delete': 'Mensaje eliminado',
  'mobile.checkin': 'Check-in (móvil)', 'mobile.checkout': 'Check-out (móvil)',
  'department.create': 'Departamento creado', 'department.update': 'Departamento editado', 'department.delete': 'Departamento eliminado',
  'position.create': 'Cargo creado', 'position.update': 'Cargo editado', 'position.delete': 'Cargo eliminado',
  'holiday.create': 'Día inhábil creado', 'holiday.update': 'Día inhábil editado', 'holiday.delete': 'Día inhábil eliminado',
  'company.update': 'Datos de empresa editados',
  'employee.notify': 'Notificación a empleado',
  'employee.send_credentials': 'Credenciales enviadas por correo',
  'settings.send_invitation': 'Invitaciones enviadas',
  'settings.save_email': 'Config. de correo guardada',
  'settings.save_checker': 'Config. de checador guardada',
  'settings.save_registro': 'Config. de registro guardada',
  'settings.save_settings': 'Configuración guardada',
  'billing.payment_initiated': 'Pago iniciado',
  'billing.receipt_download': 'Comprobante descargado',
  'auth.reset_password': 'Contraseña restablecida',
  'tenant.register': 'Empresa registrada (sign-up)',
  'report.view': 'Reporte consultado', 'report.employee_detail': 'Detalle de empleado visto',
  'report.download': 'Reporte descargado',
  'support.create_ticket': 'Ticket de soporte creado', 'support.reply': 'Respuesta en ticket',
  'employee.self_register': 'Registro desde enlace',
  'billing.subscribe': 'Plan activado',
  'billing.cancel': 'Suscripción cancelada',
  'billing.payment_confirmed': 'Pago confirmado',
}

const MODULE_COLORS: Record<string, string> = {
  auth: 'bg-slate-100 text-slate-700', employees: 'bg-blue-100 text-blue-700',
  attendance: 'bg-green-100 text-green-700', schedules: 'bg-purple-100 text-purple-700',
  messages: 'bg-amber-100 text-amber-700', mobile: 'bg-cyan-100 text-cyan-700',
  organization: 'bg-orange-100 text-orange-700', holidays: 'bg-rose-100 text-rose-700',
  company: 'bg-teal-100 text-teal-700', settings: 'bg-gray-100 text-gray-700',
  billing: 'bg-emerald-100 text-emerald-700',
  reports: 'bg-indigo-100 text-indigo-700',
  support: 'bg-pink-100 text-pink-700',
}

const MODULE_LABELS: Record<string, string> = {
  auth: 'Auth', employees: 'Empleados', attendance: 'Asistencia',
  schedules: 'Horarios', messages: 'Mensajes', mobile: 'Móvil',
  organization: 'Catálogos', holidays: 'Días inhábiles', company: 'Empresa',
  settings: 'Configuración', billing: 'Facturación',
  reports: 'Reportes', support: 'Soporte',
}

type Tab = 'active' | 'backups'

function LogsTable({ logs, loading }: { logs: AuditLog[]; loading: boolean }) {
  if (loading) return <div className="p-8 text-center text-gray-400">Cargando…</div>
  if (!logs.length) return (
    <div className="p-10 text-center text-gray-400">
      <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
      <p className="text-sm">Sin registros</p>
    </div>
  )
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Fecha</th>
            <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Usuario</th>
            <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Módulo</th>
            <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Acción</th>
            <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Origen</th>
            <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">IP</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {logs.map((log, i) => (
            <tr key={log.id ?? i} className="hover:bg-gray-50">
              <td className="px-4 py-2.5 text-gray-500 text-xs whitespace-nowrap">
                {new Date(log.createdAt).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' })}
              </td>
              <td className="px-4 py-2.5 font-medium text-gray-800">{log.userName ?? '—'}</td>
              <td className="px-4 py-2.5">
                <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${MODULE_COLORS[log.module] ?? 'bg-gray-100 text-gray-700'}`}>
                  {MODULE_LABELS[log.module] ?? log.module}
                </span>
              </td>
              <td className="px-4 py-2.5 text-gray-700">{ACTION_LABELS[log.action] ?? log.action}</td>
              <td className="px-4 py-2.5 text-xs">
                {log.source === 'mobile'
                  ? <span className="flex items-center gap-1 text-cyan-600"><Smartphone className="w-3 h-3" />Móvil</span>
                  : <span className="flex items-center gap-1 text-gray-500"><Monitor className="w-3 h-3" />Web</span>}
              </td>
              <td className="px-4 py-2.5 text-gray-400 text-xs font-mono">{log.ip ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const MODULES = ['auth','employees','organization','attendance','schedules','holidays','messages','company','settings','billing','reports','support','mobile']
const PAGE_SIZE_OPTIONS = [25, 50, 100]

function getWeekStart() {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? 6 : day - 1
  d.setDate(d.getDate() - diff)
  return d.toISOString().slice(0, 10)
}
function today() { return new Date().toISOString().slice(0, 10) }

export default function SysLogsPage() {
  const [tenants, setTenants]   = useState<TenantRow[]>([])
  const [selected, setSelected] = useState<TenantRow | null>(null)
  const [tab, setTab]           = useState<Tab>('active')
  const [auditConfig, setAuditConfig] = useState<{ retentionDays: number; mode: string } | null>(null)

  // Filtros
  const [search,   setSearch]   = useState('')
  const [module,   setModule]   = useState('')
  const [fromDate, setFromDate] = useState(getWeekStart)
  const [toDate,   setToDate]   = useState(today)

  // Active logs
  const [activeLogs,    setActiveLogs]    = useState<AuditLog[]>([])
  const [activeTotal,   setActiveTotal]   = useState(0)
  const [activePage,    setActivePage]    = useState(1)
  const [activeSize,    setActiveSize]    = useState(50)
  const [activeLoading, setActiveLoading] = useState(false)

  // Backups
  const [files,         setFiles]         = useState<BackupFile[]>([])
  const [openFile,      setOpenFile]      = useState<string | null>(null)
  const [backupLogs,    setBackupLogs]    = useState<AuditLog[]>([])
  const [backupPage,    setBackupPage]    = useState(1)
  const [backupSize,    setBackupSize]    = useState(50)
  const [backupLoading, setBackupLoading] = useState(false)

  useEffect(() => {
    sysApi.get('/tenants?page=1&pageSize=200').then(r => setTenants(r.data.data?.items ?? [])).catch(() => {})
    sysApi.get('/audit-config').then(r => setAuditConfig(r.data.data)).catch(() => {})
  }, [])

  const loadActive = useCallback(async (tenantId: string, p = 1, size = activeSize) => {
    setActiveLoading(true)
    try {
      const q = new URLSearchParams({ page: String(p), pageSize: String(size) })
      if (search)   q.set('search', search)
      if (module)   q.set('module', module)
      if (fromDate) q.set('from', fromDate)
      if (toDate)   q.set('to',   toDate)
      const r = await sysApi.get(`/logs/${tenantId}/active?${q}`)
      setActiveLogs(r.data.data.items)
      setActiveTotal(r.data.data.total)
      setActivePage(p)
      setActiveSize(size)
    } catch { } finally { setActiveLoading(false) }
  }, [search, module, fromDate, toDate, activeSize])

  const selectTenant = (t: TenantRow) => {
    setSelected(t); setTab('active'); setOpenFile(null)
    setActiveLogs([]); setFiles([]); setBackupLogs([])
    setActivePage(1); setBackupPage(1)
    loadActive(t.id, 1)
    sysApi.get(`/logs?tenantId=${t.id}`).then(r => setFiles(r.data.data)).catch(() => {})
  }

  useEffect(() => {
    if (selected && tab === 'active') loadActive(selected.id, 1)
  }, [search, module, fromDate, toDate])

  const openBackup = async (month: string) => {
    setOpenFile(month); setBackupLoading(true); setBackupPage(1)
    try {
      const r = await sysApi.get(`/logs/${selected!.id}/${month}`)
      setBackupLogs(r.data.data)
    } finally { setBackupLoading(false) }
  }

  const downloadBackup = () => {
    const blob = new Blob([JSON.stringify(backupLogs, null, 2)], { type: 'application/json' })
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `logs-${selected!.id}-${openFile}.json` })
    a.click(); URL.revokeObjectURL(a.href)
  }

  // Paginación client-side para respaldos
  const backupTotalPages = Math.ceil(backupLogs.length / backupSize)
  const backupSlice = backupLogs.slice((backupPage - 1) * backupSize, backupPage * backupSize)

  return (
    <div className="space-y-5">
      <div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Logs de actividad</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Registro de acciones por empresa —{' '}
            {auditConfig
              ? `últimos ${auditConfig.retentionDays} días en DB, respaldo ${auditConfig.mode === 'weekly' ? 'cada lunes' : 'cada día 1 del mes'}`
              : 'cargando configuración…'}
          </p>
        </div>
      </div>

      <div className="flex gap-5 min-h-[600px]">
        {/* Lista de empresas */}
        <div className="w-60 shrink-0 bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Empresas</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {tenants.length === 0
              ? <div className="p-6 text-center text-gray-400 text-sm">Cargando…</div>
              : tenants.map(t => (
                <button key={t.id} onClick={() => selectTenant(t)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors flex items-center gap-2 ${selected?.id === t.id ? 'bg-slate-50 border-l-2 border-l-slate-700' : ''}`}>
                  <p className="flex-1 text-xs font-medium text-gray-800 truncate">{t.name}</p>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                </button>
              ))}
          </div>
        </div>

        {/* Panel derecho */}
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <Activity className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Selecciona una empresa</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col min-w-0">

            {/* Header tabs */}
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-4 shrink-0">
              <p className="text-sm font-semibold text-gray-800 flex-1 truncate">{selected.name}</p>
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                <button onClick={() => setTab('active')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${tab === 'active' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  <Database className="w-3.5 h-3.5" />Activos
                </button>
                <button onClick={() => setTab('backups')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${tab === 'backups' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  <Archive className="w-3.5 h-3.5" />Respaldos ({files.length})
                </button>
              </div>
            </div>

            {/* ── Tab: logs activos ── */}
            {tab === 'active' && (
              <>
                {/* Filtros */}
                <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap gap-2 shrink-0">
                  <div className="relative flex-1 min-w-40">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                      placeholder="Buscar usuario…"
                      className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500" />
                  </div>
                  <select value={module} onChange={e => setModule(e.target.value)}
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-500">
                    <option value="">Todos los módulos</option>
                    {MODULES.map(m => <option key={m} value={m}>{MODULE_LABELS[m] ?? m}</option>)}
                  </select>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-500">Desde</span>
                    <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                      className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-500">Hasta</span>
                    <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                      className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500" />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  <LogsTable logs={activeLogs} loading={activeLoading} />
                </div>

                <Pagination
                  page={activePage}
                  totalPages={Math.ceil(activeTotal / activeSize)}
                  totalCount={activeTotal}
                  pageSize={activeSize}
                  pageSizeOptions={PAGE_SIZE_OPTIONS}
                  onPageChange={p => loadActive(selected.id, p)}
                  onPageSizeChange={s => loadActive(selected.id, 1, s)}
                />
              </>
            )}

            {/* ── Tab: respaldos ── */}
            {tab === 'backups' && (
              openFile ? (
                <>
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3 shrink-0">
                    <button onClick={() => { setOpenFile(null); setBackupPage(1) }} className="p-1 rounded hover:bg-gray-100">
                      <ArrowLeft className="w-4 h-4 text-gray-500" />
                    </button>
                    <p className="text-sm font-semibold text-gray-800 flex-1">Respaldo — {openFile} ({backupLogs.length} registros)</p>
                    <button onClick={downloadBackup}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-800 text-white rounded-lg hover:bg-slate-900">
                      <Download className="w-3.5 h-3.5" /> Descargar
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    <LogsTable logs={backupSlice} loading={backupLoading} />
                  </div>
                  <Pagination
                    page={backupPage}
                    totalPages={backupTotalPages}
                    totalCount={backupLogs.length}
                    pageSize={backupSize}
                    pageSizeOptions={PAGE_SIZE_OPTIONS}
                    onPageChange={p => setBackupPage(p)}
                    onPageSizeChange={s => { setBackupSize(s); setBackupPage(1) }}
                  />
                </>
              ) : (
                <div className="flex-1 overflow-y-auto">
                  {files.length === 0 ? (
                    <div className="p-10 text-center text-gray-400">
                      <Archive className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Sin respaldos aún</p>
                      <p className="text-xs mt-1">
                        Los respaldos se generan automáticamente {auditConfig?.mode === 'weekly' ? 'cada lunes' : 'cada día 1 del mes'}
                      </p>
                    </div>
                  ) : files.map(f => (
                    <button key={f.month} onClick={() => openBackup(f.month)}
                      className="w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors flex items-center gap-3">
                      <FileText className="w-4 h-4 text-slate-400" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">{f.month}</p>
                        <p className="text-xs text-gray-400">{f.sizeKb} KB · {f.filename}</p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                    </button>
                  ))}
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  )
}
