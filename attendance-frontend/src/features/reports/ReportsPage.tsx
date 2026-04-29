import { useState, useEffect, useCallback, useMemo } from 'react'
import PlanGate from '@/components/PlanGate'
import { createPortal } from 'react-dom'
import { FileText, Search, Eye, X } from 'lucide-react'
import Pagination from '@/components/Pagination'
import { reportsService } from './reportsService'
import { employeeService } from '../employees/employeeService'
import { REPORT_DEFINITIONS } from '@/types/report'
import ReportViewerModal from './ReportViewerModal'
import type { ReportType, AttendanceReportRow } from '@/types/report'
import { createTour } from '@/utils/tour'
import HelpButton from '@/components/HelpButton'

const PAGE_SIZE_OPTIONS = [10, 20, 50]

function today() {
  return new Date().toISOString().slice(0, 10)
}
function firstOfMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}
function fmtDate(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}
function fmtTime(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true })
}

// ─── Employee group ───────────────────────────────────────────────────────────

interface EmployeeGroup {
  employeeCode: string
  fullName:     string
  department:   string
  rows:         AttendanceReportRow[]
}

/** Para el reporte general, un día con varias entradas/salidas cuenta como un solo día */
function dedupByDate(rows: AttendanceReportRow[]): AttendanceReportRow[] {
  const seen = new Set<string>()
  return rows.filter(r => {
    if (seen.has(r.date)) return false
    seen.add(r.date)
    return true
  })
}

function buildGroups(rows: AttendanceReportRow[]): EmployeeGroup[] {
  const map = new Map<string, EmployeeGroup>()
  for (const row of rows) {
    const g = map.get(row.employeeCode)
    if (g) g.rows.push(row)
    else map.set(row.employeeCode, {
      employeeCode: row.employeeCode,
      fullName:     row.fullName,
      department:   row.department,
      rows:         [row],
    })
  }
  return Array.from(map.values()).sort((a, b) => a.fullName.localeCompare(b.fullName))
}

// ─── Dates popover ────────────────────────────────────────────────────────────

function DatesModal({ group, reportType, onClose }: { group: EmployeeGroup; reportType: ReportType; onClose: () => void }) {
  const displayRows = reportType === 'general' ? dedupByDate(group.rows) : group.rows

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const titleMap: Record<ReportType, string> = {
    general:           'Días con registro',
    absences:          'Días con falta',
    lates:             'Días con retardo',
    'early-departures': 'Días con salida anticipada',
    halfday:           'Días de medio día',
  }

  return createPortal(
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm flex flex-col max-h-[70vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
          <div>
            <p className="font-semibold text-gray-800 text-sm">{group.fullName}</p>
            <p className="text-xs text-gray-400">{titleMap[reportType]} — {displayRows.length} fecha{displayRows.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1">
          {displayRows.map((r, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 text-sm">
              <span className="text-gray-700 font-medium w-24 shrink-0">{fmtDate(r.date)}</span>
              <span className="text-gray-400 w-20 shrink-0">{r.dayName}</span>
              {reportType === 'general' && (
                <StatusBadge statusKey={r.statusKey} label={r.statusLabel} />
              )}
              {reportType === 'lates' && (
                <span className="text-yellow-600 ml-auto text-xs font-medium">
                  {r.checkInTime ? fmtTime(r.checkInTime) : '—'}
                  {r.delayMinutes != null ? ` (+${r.delayMinutes} min)` : ''}
                </span>
              )}
              {reportType === 'early-departures' && (
                <span className="text-orange-600 ml-auto text-xs font-medium">
                  {r.checkOutTime ? fmtTime(r.checkOutTime) : '—'}
                  {r.earlyLeaveMinutes != null ? ` (-${r.earlyLeaveMinutes} min)` : ''}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  )
}

function DatesCell({ group, reportType }: { group: EmployeeGroup; reportType: ReportType }) {
  const [open, setOpen] = useState(false)
  const displayRows = reportType === 'general' ? dedupByDate(group.rows) : group.rows
  const count = displayRows.length

  // Single date — show it directly
  if (count === 1) {
    const r = displayRows[0]
    return (
      <span className="text-xs text-gray-500">
        {fmtDate(r.date)} <span className="text-gray-400">{r.dayName}</span>
      </span>
    )
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center px-2 py-0.5 bg-gray-100 hover:bg-primary-100 hover:text-primary-700 rounded-full text-xs font-medium text-gray-600 transition-colors"
      >
        {count} fechas
      </button>
      {open && <DatesModal group={group} reportType={reportType} onClose={() => setOpen(false)} />}
    </>
  )
}

function StatusBadge({ statusKey, label }: { statusKey: string; label: string }) {
  const colors: Record<string, string> = {
    Present: 'bg-green-100 text-green-700',
    Late:    'bg-yellow-100 text-yellow-700',
    Absent:  'bg-red-100 text-red-700',
    HalfDay: 'bg-blue-100 text-blue-700',
  }
  return (
    <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${colors[statusKey] ?? 'bg-gray-100 text-gray-600'}`}>
      {label}
    </span>
  )
}

// ─── Summary cell per report type ─────────────────────────────────────────────

function SummaryCell({ group, reportType }: { group: EmployeeGroup; reportType: ReportType }) {
  switch (reportType) {
    case 'absences':
      return <span className="font-semibold text-red-600">{group.rows.length}</span>
    case 'lates': {
      const total = group.rows.reduce((s, r) => s + (r.delayMinutes ?? 0), 0)
      return (
        <span className="text-yellow-700 font-medium">
          {group.rows.length} × <span className="text-xs">({total} min total)</span>
        </span>
      )
    }
    case 'early-departures': {
      const total = group.rows.reduce((s, r) => s + (r.earlyLeaveMinutes ?? 0), 0)
      return (
        <span className="text-orange-700 font-medium">
          {group.rows.length} × <span className="text-xs">({total} min total)</span>
        </span>
      )
    }
    default:
      // General: contar días únicos, no registros individuales
      return <span className="text-gray-600">{dedupByDate(group.rows).length}</span>
  }
}

function summaryLabel(reportType: ReportType) {
  switch (reportType) {
    case 'absences':         return 'Faltas'
    case 'lates':            return 'Retardos'
    case 'early-departures': return 'Salidas anticipadas'
    default:                 return 'Registros'
  }
}

// ─── Main page ────────────────────────────────────────────────────────────────

function ReportsPageInner() {
  const [selected,    setSelected]    = useState<ReportType>('general')
  const [from,        setFrom]        = useState(firstOfMonth())
  const [to,          setTo]          = useState(today())
  const [department,  setDepartment]  = useState('Todos')
  const [search,      setSearch]      = useState('')
  const [departments, setDepts]       = useState<string[]>(['Todos'])
  const [page,        setPage]        = useState(1)
  const [pageSize,    setPageSize]    = useState(20)
  const [allRows,     setAllRows]     = useState<AttendanceReportRow[]>([])
  const [loading,     setLoading]     = useState(false)
  const [generated,   setGenerated]   = useState(false)

  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set())
  const [viewer, setViewer] = useState<{ codes: string[]; initialCode: string } | null>(null)

  // Group all rows by employee (memoized)
  const groups = useMemo(() => buildGroups(allRows), [allRows])

  // Paged slice
  const pagedGroups = useMemo(
    () => groups.slice((page - 1) * pageSize, page * pageSize),
    [groups, page, pageSize]
  )

  useEffect(() => {
    employeeService.getAll().then(emps => {
      const depts = Array.from(new Set(emps.map(e => e.departmentName).filter(Boolean))).sort() as string[]
      setDepts(['Todos', ...depts])
    }).catch(() => {})
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await reportsService.getReport({
        reportType: selected,
        from,
        to,
        department: department !== 'Todos' ? department : undefined,
        search:     search || undefined,
        page:       1,
        pageSize:   9999,
      })
      setAllRows(data.items)
      setGenerated(true)
      setPage(1)
    } catch {
      // keep previous
    } finally {
      setLoading(false)
    }
  }, [selected, from, to, department, search])

  const handleGenerate = () => {
    setSelectedCodes(new Set())
    load()
  }

  const handleSelectReport = (id: ReportType) => {
    setSelected(id)
    setAllRows([])
    setGenerated(false)
    setPage(1)
    setSelectedCodes(new Set())
  }

  // ── Checkbox logic ─────────────────────────────────────────────────────────
  const visibleCodes = pagedGroups.map(g => g.employeeCode)
  const allChecked   = visibleCodes.length > 0 && visibleCodes.every(c => selectedCodes.has(c))
  const someChecked  = visibleCodes.some(c => selectedCodes.has(c))

  const toggleSelectAll = () => {
    if (allChecked) {
      setSelectedCodes(new Set())
    } else {
      // Select all groups (all pages)
      setSelectedCodes(new Set(groups.map(g => g.employeeCode)))
    }
  }

  const toggleCode = (code: string) => {
    setSelectedCodes(prev => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  // ── Viewer ─────────────────────────────────────────────────────────────────
  const openViewer = (code: string) => {
    setViewer({ codes: [code], initialCode: code })
  }

  const openSelectedViewer = () => {
    const codes = Array.from(selectedCodes)
    if (codes.length === 0) return
    setViewer({ codes, initialCode: codes[0] })
  }

  const totalPages = Math.max(1, Math.ceil(groups.length / pageSize))

  function runTour() {
    createTour([
      { element: '#tour-rep-header',  title: 'Reportes de asistencia', description: 'Genera reportes detallados de asistencia filtrados por fechas, departamento o empleado. Los datos provienen de las marcaciones registradas en el módulo de Asistencia.' },
      { element: '#tour-rep-types',   title: 'Tipos de reporte',       description: 'Elige el tipo de reporte en el panel izquierdo: por día, por empleado, resumen de horas, etc. Cada tipo muestra la información organizada de forma diferente.' },
      { element: '#tour-rep-filters', title: 'Filtros de búsqueda',    description: 'Selecciona el rango de fechas, departamento y empleado específico. Presiona "Buscar" para generar el reporte.' },
    ]).drive()
  }

  return (
    <div className="flex flex-col -mt-6 -mb-6 h-[calc(100vh-3.5rem)]">

      {/* Header */}
      <div id="tour-rep-header" className="py-5 shrink-0 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
          <p className="text-gray-500 text-sm mt-0.5">Genera y consulta reportes de asistencia</p>
          <div className="mt-1"><HelpButton onClick={runTour} /></div>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0 border-t border-gray-200">

        {/* Left panel — sidebar en desktop, barra horizontal en mobile */}
        <aside id="tour-rep-types" className="md:w-72 md:shrink-0 bg-white border-b md:border-b-0 md:border-r border-gray-200 md:overflow-y-auto">
          <div className="hidden md:block p-4 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Tipos de reporte</p>
          </div>
          <nav className="flex md:flex-col overflow-x-auto md:overflow-visible p-2 gap-1 md:gap-0 md:space-y-0.5 no-scrollbar">
            {REPORT_DEFINITIONS.map(r => (
              <button
                key={r.id}
                onClick={() => handleSelectReport(r.id)}
                className={`shrink-0 md:shrink md:w-full text-left px-3 py-2 md:py-2.5 rounded-lg text-sm transition-colors flex items-center md:items-start gap-2 whitespace-nowrap md:whitespace-normal
                  ${selected === r.id
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'}`}
              >
                <span className="text-base leading-tight md:mt-0.5">{r.icon}</span>
                <span className="leading-snug">{r.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Right panel */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0 relative">

          {/* Filters bar */}
          <div id="tour-rep-filters" className="bg-white border-b border-gray-200 px-4 py-4 shrink-0">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500 font-medium">Desde</label>
                <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500 font-medium">Hasta</label>
                <input type="date" value={to} onChange={e => setTo(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500 font-medium">Departamento</label>
                <select value={department} onChange={e => setDepartment(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500">
                  {departments.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
                <label className="text-xs text-gray-500 font-medium">Buscar empleado</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" value={search}
                    onChange={e => setSearch(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleGenerate()}
                    placeholder="Nombre o código…"
                    className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
              </div>
              <button onClick={handleGenerate} disabled={loading}
                className="px-5 py-1.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors">
                {loading ? 'Buscando…' : 'Buscar'}
              </button>
            </div>
          </div>

          {/* Table area */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {!generated ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
                <FileText className="w-12 h-12 opacity-30" />
                <p className="text-sm">Selecciona un rango de fechas y presiona <strong>Buscar</strong></p>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center h-full text-gray-400">
                <p className="text-sm">Cargando reporte…</p>
              </div>
            ) : groups.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                <p className="text-sm">Sin registros para los filtros seleccionados.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 w-10">
                      <input type="checkbox" checked={allChecked}
                        ref={el => { if (el) el.indeterminate = someChecked && !allChecked }}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-gray-300 text-primary-600 cursor-pointer" />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-10">#</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Código</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Empleado</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Depto.</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {summaryLabel(selected)}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Fechas</th>
                    <th className="px-4 py-3 w-12" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pagedGroups.map((g, idx) => (
                    <tr key={g.employeeCode}
                      className={`transition-colors ${selectedCodes.has(g.employeeCode) ? 'bg-primary-50 hover:bg-primary-100' : 'hover:bg-gray-50'}`}>
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={selectedCodes.has(g.employeeCode)}
                          onChange={() => toggleCode(g.employeeCode)}
                          className="w-4 h-4 rounded border-gray-300 text-primary-600 cursor-pointer" />
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{(page - 1) * pageSize + idx + 1}</td>
                      <td className="px-4 py-3 text-gray-700 font-mono text-xs">{g.employeeCode}</td>
                      <td className="px-4 py-3 text-gray-800 font-medium">{g.fullName}</td>
                      <td className="px-4 py-3 text-gray-500">{g.department}</td>
                      <td className="px-4 py-3">
                        <SummaryCell group={g} reportType={selected} />
                      </td>
                      <td className="px-4 py-3">
                        <DatesCell group={g} reportType={selected} />
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => openViewer(g.employeeCode)}
                          className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 hover:text-primary-600 transition-colors"
                          title="Ver reporte del empleado">
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {groups.length > 0 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              totalCount={groups.length}
              pageSize={pageSize}
              onPageChange={setPage}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageSizeChange={ps => { setPageSize(ps); setPage(1) }}
            />
          )}

          {/* Floating action bar */}
          {selectedCodes.size > 0 && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20
              bg-gray-900 text-white rounded-xl shadow-xl px-4 py-2.5
              flex items-center gap-4 text-sm whitespace-nowrap">
              <button onClick={() => setSelectedCodes(new Set())}
                className="text-gray-400 hover:text-white transition-colors">
                ✕ Limpiar
              </button>
              <span className="text-gray-300">|</span>
              <span className="font-medium">
                {selectedCodes.size} empleado{selectedCodes.size !== 1 ? 's' : ''} seleccionado{selectedCodes.size !== 1 ? 's' : ''}
              </span>
              <button onClick={openSelectedViewer}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-primary-600 hover:bg-primary-500 rounded-lg font-medium transition-colors">
                <FileText className="w-4 h-4" />
                Generar reporte
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Viewer modal */}
      {viewer && (
        <ReportViewerModal
          employeeCodes={viewer.codes}
          initialCode={viewer.initialCode}
          from={from}
          to={to}
          reportType={selected}
          onClose={() => setViewer(null)}
        />
      )}
    </div>
  )
}

export default function ReportsPage() {
  return <PlanGate capability="reports"><ReportsPageInner /></PlanGate>
}
