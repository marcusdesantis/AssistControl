import { useState, useEffect, useCallback } from 'react'
import { FileText, ChevronRight, ArrowLeft, Download, Activity, Monitor, Smartphone, Search, Database, Archive, Loader2 } from 'lucide-react'
import { sysApi } from '@/services/sysApi'
import Pagination from '@/components/Pagination'
import { createTour } from '@/utils/tour'
import HelpButton from '@/components/HelpButton'

interface TenantRow  { id: string; name: string }
interface BackupFile { month: string; filename: string; sizeKb: number }
interface AuditLog   { id: string; userName?: string; action: string; module: string; detail?: string; ip?: string; source: string; createdAt: string }

function buildActionLabel(action: string, detail?: string | null): string {
  const base = ACTION_LABELS[action] ?? action
  if (!detail) return base
  try {
    const d = JSON.parse(detail)
    const parts: string[] = []
    if (d.name)          parts.push(d.name)
    if (d.code)          parts.push(`(${d.code})`)
    if (d.employeeCode && !d.code) parts.push(`(${d.employeeCode})`)
    if (d.event)         parts.push(`[${d.event}]`)
    if (d.status)        parts.push(`→ ${d.status}`)
    if (d.date)          parts.push(`· ${d.date}`)
    if (d.subject)       parts.push(`"${d.subject}"`)
    if (d.recipients != null) parts.push(`→ ${d.recipients} dest.`)
    if (d.plan)          parts.push(`· ${d.plan}`)
    if (d.amountPaid != null) parts.push(`$${d.amountPaid}`)
    if (d.invoiceNumber) parts.push(`#${d.invoiceNumber}`)
    if (d.amount != null && !d.amountPaid) parts.push(`$${d.amount}`)
    if (d.category)      parts.push(`[${d.category}]`)
    if (d.reportType)    parts.push(d.reportType)
    if (d.format)        parts.push(d.format.toUpperCase())
    if (d.companyName)   parts.push(d.companyName)
    if (d.count != null)       parts.push(`${d.count} invitaciones`)
    if (d.employees != null)   parts.push(`· ${d.employees} empleado${d.employees !== 1 ? 's' : ''}`)
    if (d.reassignedTo)        parts.push(`→ ${d.reassignedTo}`)
    return parts.length ? `${base}: ${parts.join(' ')}` : base
  } catch {
    return base
  }
}

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
  'settings.save_planes':   'Config. de planes guardada',
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
    <>
      {/* ── Móvil: cards ── */}
      <div className="divide-y divide-gray-100 md:hidden">
        {logs.map((log, i) => (
          <div key={log.id ?? i} className="px-4 py-3 hover:bg-gray-50 transition-colors space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-gray-900 text-sm truncate">{log.userName ?? '—'}</p>
              <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${MODULE_COLORS[log.module] ?? 'bg-gray-100 text-gray-700'}`}>
                {MODULE_LABELS[log.module] ?? log.module}
              </span>
            </div>
            <p className="text-xs text-gray-600">{buildActionLabel(log.action, log.detail)}</p>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="whitespace-nowrap">
                {new Date(log.createdAt).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' })}
              </span>
              {log.source === 'mobile'
                ? <span className="flex items-center gap-1 text-cyan-600"><Smartphone className="w-3 h-3" />Móvil</span>
                : <span className="flex items-center gap-1 text-gray-400"><Monitor className="w-3 h-3" />Web</span>}
            </div>
          </div>
        ))}
      </div>

      {/* ── Desktop: tabla ── */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 whitespace-nowrap">Fecha</th>
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
                <td className="px-4 py-2.5 text-gray-700">{buildActionLabel(log.action, log.detail)}</td>
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
    </>
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

  // Backups — lista de archivos
  const [files,          setFiles]          = useState<BackupFile[]>([])
  const [backupSearch,   setBackupSearch]   = useState('')
  const [selectedFiles,  setSelectedFiles]  = useState<string[]>([])
  const [filesPage,      setFilesPage]      = useState(1)
  const [filesSize,      setFilesSize]      = useState(8)

  // Backups — vista de logs combinados
  const [mergedLogs,     setMergedLogs]     = useState<AuditLog[]>([])
  const [backupPage,     setBackupPage]     = useState(1)
  const [backupSize,     setBackupSize]     = useState(50)
  const [backupLoading,  setBackupLoading]  = useState(false)
  const [viewingBackup,  setViewingBackup]  = useState(false)

  // Filtros de la vista de respaldos (mismos que activos)
  const [bkSearch,    setBkSearch]    = useState('')
  const [bkModule,    setBkModule]    = useState('')
  const [bkFrom,      setBkFrom]      = useState('')
  const [bkTo,        setBkTo]        = useState('')
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    sysApi.get('/tenants?page=1&pageSize=200').then(r => {
      const items: TenantRow[] = r.data.data?.items ?? []
      setTenants(items)
      // Auto-seleccionar la primera empresa
      if (items.length > 0) selectTenant(items[0])
    }).catch(() => {})
    sysApi.get('/audit-config').then(r => setAuditConfig(r.data.data)).catch(() => {})
  }, [])

  const runTour = () => createTour([
    { element: '#tour-logs-companies',  title: 'Lista de empresas',       description: 'Selecciona una empresa para ver su actividad. Se selecciona automáticamente la primera al entrar.' },
    { element: '#tour-logs-tabs',       title: 'Activos vs Respaldos',    description: '<b>Activos</b>: logs del período actual en la base de datos.<br><b>Respaldos</b>: archivos históricos en JSON generados automáticamente al cumplirse el período de retención.' },
    { element: '#tour-logs-filters',    title: 'Filtros de logs activos', description: 'Filtra por módulo, rango de fechas o usuario. Por defecto muestra desde el lunes de la semana actual hasta hoy. Los cambios aplican automáticamente.' },
    { element: '#tour-logs-table',      title: 'Tabla de actividad',      description: 'Cada fila muestra fecha, usuario, módulo, acción, origen (web o <b>app móvil</b>) e IP. Los logins desde la app móvil también quedan registrados aquí.' },
    { element: '#tour-logs-backups',    title: 'Respaldos históricos',    description: 'Selecciona uno o varios archivos con el checkbox y pulsa <b>Ver</b> para combinarlos. Dentro puedes filtrar por módulo, usuario y fechas — igual que en logs activos. El botón <b>Descargar</b> exporta solo los registros filtrados.' },
  ]).drive()

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
    setSelected(t); setTab('active')
    setActiveLogs([]); setFiles([]); setMergedLogs([])
    setSelectedFiles([]); setViewingBackup(false)
    setActivePage(1); setBackupPage(1); setFilesPage(1)
    setBkSearch(''); setBkModule(''); setBkFrom(''); setBkTo('')
    loadActive(t.id, 1)
    sysApi.get(`/logs?tenantId=${t.id}`).then(r => setFiles(r.data.data)).catch(() => {})
  }

  useEffect(() => {
    if (selected && tab === 'active') loadActive(selected.id, 1)
  }, [search, module, fromDate, toDate])

  useEffect(() => { setBackupPage(1) }, [bkSearch, bkModule, bkFrom, bkTo])
  useEffect(() => { setFilesPage(1)  }, [backupSearch, filesSize])

  const viewSelectedBackups = async () => {
    if (!selectedFiles.length || !selected) return
    setBackupLoading(true); setBackupPage(1)
    setBkSearch(''); setBkModule(''); setBkFrom(''); setBkTo('')
    try {
      const all = await Promise.all(
        selectedFiles.map(m => sysApi.get(`/logs/${selected.id}/${m}`).then(r => r.data.data as AuditLog[]))
      )
      const merged = all.flat().sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      setMergedLogs(merged)
      setViewingBackup(true)
    } finally { setBackupLoading(false) }
  }

  const downloadMerged = () => {
    setDownloading(true)
    try {
      const now    = new Date()
      const today  = now.toISOString().slice(0, 10)
      const time   = now.toTimeString().slice(0, 8).replace(/:/g, '-')
      const datePart   = (bkFrom || bkTo)
        ? `${bkFrom || today}_al_${bkTo || today}`
        : today
      const modulePart = bkModule || 'all'
      const blob = new Blob([JSON.stringify(filteredMerged, null, 2)], { type: 'application/json' })
      const a = Object.assign(document.createElement('a'), {
        href: URL.createObjectURL(blob),
        download: `logs-${datePart}_${time}_${modulePart}.json`,
      })
      a.click(); URL.revokeObjectURL(a.href)
    } finally {
      setTimeout(() => setDownloading(false), 900)
    }
  }

  const toggleFile = (month: string) =>
    setSelectedFiles(prev => prev.includes(month) ? prev.filter(m => m !== month) : [...prev, month])

  // Lista de archivos filtrada y paginada
  const filteredFiles     = files.filter(f => f.month.includes(backupSearch))
  const filesTotalPages   = Math.ceil(filteredFiles.length / filesSize)
  const filesSlice        = filteredFiles.slice((filesPage - 1) * filesSize, filesPage * filesSize)
  const allSelected       = filteredFiles.length > 0 && filteredFiles.every(f => selectedFiles.includes(f.month))
  const toggleAll         = () => allSelected
    ? setSelectedFiles(prev => prev.filter(m => !filteredFiles.some(f => f.month === m)))
    : setSelectedFiles(prev => [...new Set([...prev, ...filteredFiles.map(f => f.month)])])

  // Logs combinados con filtros aplicados
  const filteredMerged = mergedLogs.filter(log => {
    if (bkModule && log.module !== bkModule) return false
    if (bkSearch && !log.userName?.toLowerCase().includes(bkSearch.toLowerCase()) && !log.action.includes(bkSearch)) return false
    // Comparación por string YYYY-MM-DD para evitar problemas de zona horaria
    const logDate = log.createdAt.slice(0, 10)
    if (bkFrom && logDate < bkFrom) return false
    if (bkTo   && logDate > bkTo)   return false
    return true
  })

  // Paginación client-side para vista de respaldos
  const backupTotalPages = Math.ceil(filteredMerged.length / backupSize)
  const backupSlice      = filteredMerged.slice((backupPage - 1) * backupSize, backupPage * backupSize)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Logs de actividad</h1>
        <p className="text-gray-500 text-xs sm:text-sm mt-0.5">
          {auditConfig
            ? `Últimos ${auditConfig.retentionDays} días en DB · respaldo ${auditConfig.mode === 'weekly' ? 'cada lunes' : 'cada día 1 del mes'}`
            : 'Cargando configuración…'}
        </p>
        <div className="mt-1"><HelpButton onClick={runTour} /></div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-5">

        {/* Lista de empresas */}
        <div id="tour-logs-companies" className="lg:w-60 lg:shrink-0 bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col lg:min-h-[600px]">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Empresas</p>
          </div>
          {/* móvil: scroll horizontal; desktop: scroll vertical */}
          <div className="flex lg:flex-col overflow-x-auto lg:overflow-x-visible overflow-y-visible lg:overflow-y-auto flex-1">
            {tenants.length === 0
              ? <div className="p-6 text-center text-gray-400 text-sm w-full">Cargando…</div>
              : tenants.map(t => (
                <button key={t.id} onClick={() => selectTenant(t)}
                  className={`shrink-0 lg:shrink text-left px-4 py-3 lg:border-b border-r lg:border-r-0 border-gray-100 hover:bg-gray-50 transition-colors flex items-center gap-2 ${selected?.id === t.id ? 'bg-slate-50 lg:border-l-2 lg:border-l-slate-700 border-b-2 border-b-slate-700' : ''}`}>
                  <p className="text-xs font-medium text-gray-800 truncate max-w-[120px] lg:max-w-none">{t.name}</p>
                  <ChevronRight className="w-3 h-3 text-gray-300 shrink-0 hidden lg:block" />
                </button>
              ))}
          </div>
        </div>

        {/* Panel derecho */}
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 py-16">
            <div className="text-center">
              <Activity className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Selecciona una empresa</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col min-w-0">

            {/* Header tabs */}
            <div className="px-3 sm:px-4 py-3 border-b border-gray-100 flex items-center gap-2 sm:gap-4 shrink-0">
              <p className="text-sm font-semibold text-gray-800 flex-1 truncate min-w-0">{selected.name}</p>
              <div id="tour-logs-tabs" className="flex gap-1 bg-gray-100 rounded-lg p-1 shrink-0">
                <button onClick={() => setTab('active')}
                  className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${tab === 'active' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  <Database className="w-3.5 h-3.5" /><span>Activos</span>
                </button>
                <button onClick={() => setTab('backups')}
                  className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${tab === 'backups' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  <Archive className="w-3.5 h-3.5" /><span>Respaldos ({files.length})</span>
                </button>
              </div>
            </div>

            {/* ── Tab: logs activos ── */}
            {tab === 'active' && (
              <>
                {/* Filtros */}
                <div id="tour-logs-filters" className="px-3 sm:px-4 py-3 border-b border-gray-100 flex flex-wrap gap-2 shrink-0">
                  <div className="relative w-full sm:flex-1 sm:min-w-40">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                      placeholder="Buscar usuario…"
                      className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500" />
                  </div>
                  <select value={module} onChange={e => setModule(e.target.value)}
                    className="w-full sm:w-auto px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-500">
                    <option value="">Todos los módulos</option>
                    {MODULES.map(m => <option key={m} value={m}>{MODULE_LABELS[m] ?? m}</option>)}
                  </select>
                  <div className="flex items-center gap-1.5 w-full sm:w-auto">
                    <span className="text-xs text-gray-500 shrink-0">Desde</span>
                    <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                      className="flex-1 sm:flex-none px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500" />
                  </div>
                  <div className="flex items-center gap-1.5 w-full sm:w-auto">
                    <span className="text-xs text-gray-500 shrink-0">Hasta</span>
                    <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                      className="flex-1 sm:flex-none px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500" />
                  </div>
                </div>

                <div id="tour-logs-table" className="flex-1 overflow-y-auto">
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
              viewingBackup ? (
                <>
                  {/* Header backup view */}
                  <div className="px-3 sm:px-4 py-3 border-b border-gray-100 flex flex-wrap items-center gap-2 shrink-0">
                    <button onClick={() => { setViewingBackup(false); setMergedLogs([]) }} className="p-1 rounded hover:bg-gray-100 shrink-0">
                      <ArrowLeft className="w-4 h-4 text-gray-500" />
                    </button>
                    <p className="text-sm font-semibold text-gray-800 flex-1 min-w-0 truncate">
                      {selectedFiles.length === 1 ? selectedFiles[0] : `${selectedFiles.length} respaldos combinados`}
                      <span className="ml-1 text-gray-400 font-normal text-xs">
                        ({filteredMerged.length !== mergedLogs.length ? `${filteredMerged.length} de ${mergedLogs.length}` : mergedLogs.length})
                      </span>
                    </p>
                    <button onClick={downloadMerged} disabled={downloading}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-800 text-white rounded-lg hover:bg-slate-900 disabled:opacity-60 shrink-0 min-w-[110px] justify-center">
                      {downloading
                        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Descargando…</>
                        : <><Download className="w-3.5 h-3.5" /> Descargar ({filteredMerged.length})</>}
                    </button>
                  </div>

                  {/* Filtros de respaldo */}
                  <div className="px-3 sm:px-4 py-3 border-b border-gray-100 flex flex-wrap gap-2 shrink-0">
                    <div className="relative w-full sm:flex-1 sm:min-w-40">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      <input value={bkSearch} onChange={e => setBkSearch(e.target.value)}
                        placeholder="Buscar usuario…"
                        className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500" />
                    </div>
                    <select value={bkModule} onChange={e => setBkModule(e.target.value)}
                      className="w-full sm:w-auto px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-500">
                      <option value="">Todos los módulos</option>
                      {MODULES.map(m => <option key={m} value={m}>{MODULE_LABELS[m] ?? m}</option>)}
                    </select>
                    <div className="flex items-center gap-1.5 w-full sm:w-auto">
                      <span className="text-xs text-gray-500 shrink-0">Desde</span>
                      <input type="date" value={bkFrom} onChange={e => setBkFrom(e.target.value)}
                        className="flex-1 sm:flex-none px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500" />
                    </div>
                    <div className="flex items-center gap-1.5 w-full sm:w-auto">
                      <span className="text-xs text-gray-500 shrink-0">Hasta</span>
                      <input type="date" value={bkTo} onChange={e => setBkTo(e.target.value)}
                        className="flex-1 sm:flex-none px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500" />
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    <LogsTable logs={backupSlice} loading={backupLoading} />
                  </div>
                  <Pagination
                    page={backupPage}
                    totalPages={backupTotalPages}
                    totalCount={filteredMerged.length}
                    pageSize={backupSize}
                    pageSizeOptions={PAGE_SIZE_OPTIONS}
                    onPageChange={p => setBackupPage(p)}
                    onPageSizeChange={s => { setBackupSize(s); setBackupPage(1) }}
                  />
                </>
              ) : (
                <div id="tour-logs-backups" className="flex-1 flex flex-col overflow-hidden">
                  {files.length === 0 ? (
                    <div className="p-10 text-center text-gray-400">
                      <Archive className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Sin respaldos aún</p>
                      <p className="text-xs mt-1">Se generan automáticamente {auditConfig?.mode === 'weekly' ? 'cada lunes' : 'cada día 1 del mes'}</p>
                    </div>
                  ) : (
                    <>
                      {/* Buscador + acciones */}
                      <div className="px-3 sm:px-4 py-3 border-b border-gray-100 flex gap-2 shrink-0">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                          <input value={backupSearch} onChange={e => setBackupSearch(e.target.value)}
                            placeholder="Buscar por fecha…"
                            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500" />
                        </div>
                        <button
                          onClick={viewSelectedBackups}
                          disabled={selectedFiles.length === 0 || backupLoading}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-800 text-white rounded-lg hover:bg-slate-900 disabled:opacity-40 shrink-0"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Ver {selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''}
                        </button>
                      </div>

                      {/* Seleccionar todos */}
                      <div className="px-3 sm:px-4 py-2.5 border-b border-gray-100 flex items-center gap-3 shrink-0 bg-gray-50">
                        <input type="checkbox" id="select-all-backups" checked={allSelected} onChange={toggleAll}
                          className="w-4 h-4 rounded accent-slate-700 cursor-pointer" />
                        <label htmlFor="select-all-backups" className="text-xs font-medium text-gray-600 cursor-pointer select-none">
                          {allSelected ? 'Deseleccionar todos' : 'Seleccionar todos'} ({filteredFiles.length})
                        </label>
                        {selectedFiles.length > 0 && (
                          <span className="ml-auto text-xs text-slate-600 font-medium">{selectedFiles.length} selec.</span>
                        )}
                      </div>

                      {/* Lista de archivos */}
                      <div className="flex-1 overflow-y-auto">
                        {filteredFiles.length === 0 ? (
                          <div className="p-6 text-center text-gray-400 text-sm">Sin resultados</div>
                        ) : filesSlice.map(f => (
                          <label key={f.month} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer">
                            <input type="checkbox" checked={selectedFiles.includes(f.month)} onChange={() => toggleFile(f.month)}
                              className="w-4 h-4 rounded accent-slate-700 shrink-0" />
                            <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800">{f.month}</p>
                              <p className="text-xs text-gray-400">{f.sizeKb} KB</p>
                            </div>
                          </label>
                        ))}
                      </div>
                      <Pagination
                        page={filesPage}
                        totalPages={filesTotalPages}
                        totalCount={filteredFiles.length}
                        pageSize={filesSize}
                        pageSizeOptions={[8, 16, 24]}
                        onPageChange={p => setFilesPage(p)}
                        onPageSizeChange={s => { setFilesSize(s); setFilesPage(1) }}
                      />
                    </>
                  )}
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  )
}
