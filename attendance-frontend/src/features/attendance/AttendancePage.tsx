import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import {
  ChevronLeft, ChevronRight, Calendar, Search,
  LogIn, LogOut, Clock, UserCheck, UserX, Users,
  Loader2, X, FileText, History, Pencil,
  Monitor, Smartphone, Tablet, MapPin,
} from 'lucide-react'
import { createTour } from '@/utils/tour'
import HelpButton from '@/components/HelpButton'
import { attendanceService } from './attendanceService'
import { employeeService }   from '../employees/employeeService'
import Pagination            from '@/components/Pagination'
import type { AttendanceRecord, AttendanceDayRow, AttendanceDaySubRecord, AttendancePeriodRow } from '@/types/attendance'
import type { Employee } from '@/types/employee'
import type { PagedResult } from '@/types/pagination'
import { useAuthStore } from '@/store/authStore'
import { countryToLocale } from '@/utils/locale'

const PAGE_SIZE_OPTIONS = [10, 20, 50]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toLocalDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}

function formatTime(iso?: string, timeZone = 'America/Guayaquil', locale = 'es-EC'): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: true, timeZone })
}

function formatHours(h?: number): string {
  if (h == null || h <= 0) return '—'
  const hrs  = Math.floor(h)
  const mins = Math.round((h - hrs) * 60)
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`
}

function localTimeToIso(date: string, time: string): string {
  return `${date}T${time}:00`
}

const STATUS_BADGE: Record<string, string> = {
  Present: 'bg-green-100 text-green-700',
  Late:    'bg-yellow-100 text-yellow-700',
  Absent:  'bg-red-100 text-red-700',
  HalfDay: 'bg-blue-100 text-blue-700',
  None:    'bg-gray-100 text-gray-500',
}
const STATUS_LABEL: Record<string, string> = {
  Present: 'Presente', Late: 'Tarde', Absent: 'Ausente', HalfDay: 'Medio Día', None: 'Sin registro',
}


// ─── History Modal ────────────────────────────────────────────────────────────
function HistoryModal({ employee, onClose }: { employee: Employee; onClose: () => void }) {
  const _u       = useAuthStore(s => s.user)
  const _tz      = _u?.timeZone ?? 'America/Guayaquil'
  const _loc     = countryToLocale(_u?.country ?? 'EC')
  const fmt      = (iso?: string) => formatTime(iso, _tz, _loc)
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const today = toLocalDateString(new Date())
    const from  = toLocalDateString(new Date(Date.now() - 30 * 86400_000))
    attendanceService.getByEmployee(employee.id, from, today).then(setRecords).finally(() => setLoading(false))
  }, [employee.id])

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" style={{marginTop:0}}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b shrink-0">
          <div>
            <h2 className="font-semibold text-gray-900">{employee.fullName}</h2>
            <p className="text-xs text-gray-400 mt-0.5">Últimos 30 días · {employee.employeeCode}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0 p-5">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></div>
          ) : records.length === 0 ? (
            <p className="text-center text-gray-400 py-12 text-sm">Sin registros en este período</p>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase">
                  {['Fecha','Entrada','Salida','Horas','Estado'].map(h => <th key={h} className="pb-2 pr-4">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.map(r => (
                  <tr key={r.id}>
                    <td className="py-2 pr-4 text-gray-700">{r.date}</td>
                    <td className="py-2 pr-4 text-gray-600">{fmt(r.checkInTime)}</td>
                    <td className="py-2 pr-4 text-gray-600">{fmt(r.checkOutTime)}</td>
                    <td className="py-2 pr-4 text-gray-600">{formatHours(r.hoursWorked)}</td>
                    <td className="py-2">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[r.status] ?? STATUS_BADGE.None}`}>
                        {r.statusLabel ?? STATUS_LABEL[r.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── CheckOut Modal ───────────────────────────────────────────────────────────
function CheckOutModal({ employee, onConfirm, onClose, saving }: {
  employee: Employee; onConfirm: (notes: string) => void; onClose: () => void; saving: boolean
}) {
  const [notes, setNotes] = useState('')
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" style={{marginTop:0}}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Registrar salida</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
        </div>
        <p className="text-sm text-gray-600 mb-4">{employee.fullName}</p>
        <label className="block text-xs font-medium text-gray-700 mb-1">Notas (opcional)</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          placeholder="Ej: Salida anticipada por cita médica" />
        <div className="flex gap-3 mt-4 justify-end">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
          <button onClick={() => onConfirm(notes)} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white rounded-lg text-sm font-medium">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Confirmar salida
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Edit Record Modal ────────────────────────────────────────────────────────
function EditRecordModal({ record, date, onSave, onClose, saving }: {
  record: AttendanceDayRow; date: string
  onSave: (checkIn?: string, checkOut?: string, notes?: string) => void
  onClose: () => void; saving: boolean
}) {
  const toTimeInput = (iso?: string) => {
    if (!iso) return ''
    const d = new Date(iso)
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
  }

  const [checkIn,  setCheckIn]  = useState(toTimeInput(record.checkInTime))
  const [checkOut, setCheckOut] = useState(toTimeInput(record.checkOutTime))
  const [notes,    setNotes]    = useState(record.notes ?? '')
  const [error,    setError]    = useState<string | null>(null)

  const handleSave = () => {
    if (checkOut && checkIn && checkOut <= checkIn) {
      setError('La hora de salida debe ser posterior a la entrada.')
      return
    }
    const ciIso = checkIn  ? localTimeToIso(date, checkIn)  : undefined
    const coIso = checkOut ? localTimeToIso(date, checkOut) : undefined
    onSave(ciIso, coIso, notes || undefined)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" style={{marginTop:0}}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b shrink-0">
          <div>
            <h3 className="font-semibold text-gray-900">Corregir registro</h3>
            <p className="text-xs text-gray-400 mt-0.5">{record.fullName} · {date}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto flex-1 min-h-0">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hora de entrada</label>
            <input type="time" value={checkIn} onChange={e => { setCheckIn(e.target.value); setError(null) }}
              className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hora de salida</label>
            <input type="time" value={checkOut} onChange={e => { setCheckOut(e.target.value); setError(null) }}
              className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              placeholder="Justificación o comentario..." />
          </div>
        </div>
        <div className="flex justify-end gap-3 p-5 border-t shrink-0">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white rounded-lg text-sm font-medium">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Guardar corrección
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Origins Modal ────────────────────────────────────────────────────────────
function OriginIcon({ from }: { from: string }) {
  if (from === 'Web')     return <Monitor    className="w-4 h-4 text-blue-500"   />
  if (from === 'Mobile')  return <Smartphone className="w-4 h-4 text-green-500"  />
  if (from === 'Checker') return <Tablet     className="w-4 h-4 text-purple-500" />
  return <Monitor className="w-4 h-4 text-gray-400" />
}
const ORIGIN_LABEL: Record<string, string> = {
  Web: 'Web', Mobile: 'Móvil', Checker: 'Checador',
}

interface GeoAddress {
  road:    string
  city:    string
  full:    string
}

async function reverseGeocode(lat: number, lon: number): Promise<GeoAddress> {
  const res  = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`,
    { headers: { 'Accept-Language': 'es' } }
  )
  const json = await res.json()
  const a    = json.address ?? {}
  const road = [a.road, a.house_number].filter(Boolean).join(' ') || json.display_name?.split(',')[0] || '—'
  const city = a.city ?? a.town ?? a.village ?? a.municipality ?? a.county ?? '—'
  return { road, city, full: json.display_name ?? '—' }
}

function OriginsModal({ row, onClose }: { row: AttendanceDayRow; onClose: () => void }) {
  const _u2    = useAuthStore(s => s.user)
  const _tz2   = _u2?.timeZone ?? 'America/Guayaquil'
  const _loc2  = countryToLocale(_u2?.country ?? 'EC')
  const fmt    = (iso?: string) => formatTime(iso, _tz2, _loc2)
  const sorted = [...row.records].reverse()   // más reciente primero
  const withCoords = sorted.filter(r => r.latitude != null && r.longitude != null)
  const [selected,  setSelected]  = useState<AttendanceDaySubRecord | null>(withCoords[0] ?? null)
  const [addresses, setAddresses] = useState<Record<string, GeoAddress | 'loading' | 'error'>>({})

  // Fetch addresses for all records with coords
  useEffect(() => {
    const toFetch = sorted.filter(r => r.latitude != null && r.longitude != null)
    toFetch.forEach(async (r, i) => {
      setAddresses(prev => ({ ...prev, [r.id]: 'loading' }))
      // stagger requests to respect Nominatim rate limit (1 req/s)
      await new Promise(res => setTimeout(res, i * 1100))
      try {
        const addr = await reverseGeocode(r.latitude!, r.longitude!)
        setAddresses(prev => ({ ...prev, [r.id]: addr }))
      } catch {
        setAddresses(prev => ({ ...prev, [r.id]: 'error' }))
      }
    })
  }, [sorted.length])

  const mapSrc = selected?.latitude != null && selected?.longitude != null
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${selected.longitude - 0.0015},${selected.latitude - 0.0015},${selected.longitude + 0.0015},${selected.latitude + 0.0015}&layer=mapnik&marker=${selected.latitude},${selected.longitude}`
    : null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3" style={{ marginTop: 0 }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[96vw] flex flex-col" style={{ height: '94vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{row.fullName}</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {row.employeeCode} · {row.department} · {row.records.length} registro{row.records.length !== 1 ? 's' : ''} hoy
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">

          {/* Left — records list */}
          <div className="w-full md:w-[380px] md:shrink-0 border-b md:border-b-0 md:border-r border-gray-200 overflow-y-auto p-4 space-y-4 md:max-h-none max-h-[45vh]">
            {row.records.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-12">Sin registros este día</p>
            )}
            {sorted.map((r, i) => {
              const hasCoords = r.latitude != null && r.longitude != null
              const isSelected = selected?.id === r.id
              const addr = hasCoords ? addresses[r.id] : undefined

              return (
                <div
                  key={r.id}
                  onClick={() => hasCoords && setSelected(r)}
                  className={`rounded-xl border transition-all ${
                    isSelected
                      ? 'border-primary-400 bg-primary-50 ring-1 ring-primary-300'
                      : hasCoords
                        ? 'border-gray-200 hover:border-primary-200 hover:shadow-sm cursor-pointer'
                        : 'border-gray-100'
                  }`}
                >
                  {/* Card header */}
                  <div className="flex items-center gap-3 px-4 pt-4 pb-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      r.registeredFrom === 'Web'     ? 'bg-blue-50' :
                      r.registeredFrom === 'Mobile'  ? 'bg-green-50' :
                      r.registeredFrom === 'Checker' ? 'bg-purple-50' : 'bg-gray-50'
                    }`}>
                      <OriginIcon from={r.registeredFrom} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">
                          {ORIGIN_LABEL[r.registeredFrom] ?? r.registeredFrom}
                        </span>
                        {isSelected && (
                          <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-medium">
                            Mostrando en mapa
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">Registro #{i + 1}</p>
                    </div>
                  </div>

                  {/* Times */}
                  <div className="grid grid-cols-3 gap-px bg-gray-100 border-t border-gray-100">
                    {[
                      { label: 'Entrada',  value: fmt(r.checkInTime) },
                      { label: 'Salida',   value: r.checkOutTime ? fmt(r.checkOutTime) : '—' },
                      { label: 'Duración', value: formatHours(r.hoursWorked) },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-white px-3 py-2.5 text-center">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">{label}</p>
                        <p className="text-sm font-semibold text-gray-800 mt-0.5 font-mono">{value}</p>
                      </div>
                    ))}
                  </div>

                  {/* GPS info */}
                  {hasCoords && (
                    <div className="px-4 py-3 border-t border-gray-100 space-y-2">
                      {/* Coords */}
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
                        <div className="font-mono text-xs text-gray-500 leading-4">
                          <span className="select-all">{r.latitude!.toFixed(6)}</span>
                          <span className="text-gray-300 mx-1">,</span>
                          <span className="select-all">{r.longitude!.toFixed(6)}</span>
                        </div>
                      </div>

                      {/* Address */}
                      <div className="flex items-start gap-2">
                        <div className="w-3.5 shrink-0" />
                        {addr === 'loading' && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-400">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Obteniendo dirección…</span>
                          </div>
                        )}
                        {addr === 'error' && (
                          <p className="text-xs text-red-400">No se pudo obtener la dirección</p>
                        )}
                        {addr && addr !== 'loading' && addr !== 'error' && (
                          <div className="text-xs text-gray-700 leading-4">
                            <p className="font-medium">{addr.road}</p>
                            <p className="text-gray-500">{addr.city}</p>
                          </div>
                        )}
                      </div>

                      {/* Open in Google Maps */}
                      <div className="flex items-center gap-2 pt-1">
                        <div className="w-3.5 shrink-0" />
                        <a
                          href={`https://www.google.com/maps?q=${r.latitude},${r.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary-600 hover:text-primary-800 underline underline-offset-2"
                          onClick={e => e.stopPropagation()}
                        >
                          Abrir en Google Maps ↗
                        </a>
                      </div>
                    </div>
                  )}

                  {!hasCoords && (
                    <div className="px-4 py-2.5 border-t border-gray-100">
                      <p className="text-xs text-gray-400 flex items-center gap-1.5">
                        <MapPin className="w-3 h-3" />
                        Sin ubicación GPS
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Right — map */}
          <div className="flex-1 min-w-0 bg-gray-100 relative flex flex-col">
            {mapSrc ? (
              <>
                <iframe
                  key={mapSrc}
                  src={mapSrc}
                  className="w-full flex-1 border-0"
                  title="Ubicación"
                  loading="lazy"
                />
                {/* Address overlay */}
                {selected && addresses[selected.id] && addresses[selected.id] !== 'loading' && addresses[selected.id] !== 'error' && (
                  <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 px-4 py-3 flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {(addresses[selected.id] as GeoAddress).road}
                      </p>
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {(addresses[selected.id] as GeoAddress).full}
                      </p>
                    </div>
                    <div className="ml-auto text-right shrink-0">
                      <p className="text-xs font-mono text-gray-500">{selected.latitude!.toFixed(6)}</p>
                      <p className="text-xs font-mono text-gray-500">{selected.longitude!.toFixed(6)}</p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
                <MapPin className="w-16 h-16 opacity-10" />
                <p className="text-sm font-medium">
                  {row.records.length === 0 ? 'Sin registros' : 'Sin coordenadas GPS'}
                </p>
                <p className="text-xs text-gray-300 text-center max-w-xs">
                  {row.records.length > 0
                    ? 'Los registros de este día no incluyen ubicación GPS. La ubicación se captura automáticamente desde la app móvil o el checador.'
                    : ''}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Period View ──────────────────────────────────────────────────────────────
function PeriodView() {
  const today   = toLocalDateString(new Date())
  const weekAgo = toLocalDateString(new Date(Date.now() - 7 * 86400_000))

  const [from,       setFrom]       = useState(weekAgo)
  const [to,         setTo]         = useState(today)
  const [page,       setPage]       = useState(1)
  const [pageSize,   setPageSize]   = useState(10)
  const [search,     setSearch]     = useState('')
  const [deptFilter, setDeptFilter] = useState('Todos')
  const [result,     setResult]     = useState<PagedResult<AttendancePeriodRow> | null>(null)
  const [loading,    setLoading]    = useState(false)
  const [departments,setDepts]      = useState<string[]>(['Todos'])

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cargar departamentos una vez
  useEffect(() => {
    employeeService.getAll().then(emps => {
      const depts = Array.from(new Set(emps.map(e => e.departmentName).filter(Boolean))).sort() as string[]
      setDepts(['Todos', ...depts])
    }).catch(() => {})
  }, [])

  const load = useCallback(() => {
    if (!from || !to || from > to) return
    setLoading(true)
    attendanceService.getPeriodView({
      from, to, page, pageSize,
      search:     search     || undefined,
      department: deptFilter !== 'Todos' ? deptFilter : undefined,
    }).then(setResult).catch(() => {}).finally(() => setLoading(false))
  }, [from, to, page, pageSize, search, deptFilter])

  useEffect(() => { load() }, [load])

  const handleSearch = (val: string) => {
    setSearch(val)
    setPage(1)
  }

  const handleDept = (val: string) => {
    setDeptFilter(val)
    setPage(1)
  }

  const handlePageSize = (n: number) => {
    setPageSize(n)
    setPage(1)
  }

  const rows   = result?.items ?? []
  const totals = useMemo(() => ({
    present: rows.reduce((s, r) => s + r.present,    0),
    late:    rows.reduce((s, r) => s + r.late,       0),
    absent:  rows.reduce((s, r) => s + r.absent,     0),
    hours:   rows.reduce((s, r) => s + r.totalHours, 0),
  }), [rows])

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Desde</label>
          <input type="date" value={from} max={to} onChange={e => { setFrom(e.target.value); setPage(1) }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Hasta</label>
          <input type="date" value={to} min={from} max={today} onChange={e => { setTo(e.target.value); setPage(1) }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => {
              if (searchTimer.current) clearTimeout(searchTimer.current)
              searchTimer.current = setTimeout(() => handleSearch(e.target.value), 300)
              setSearch(e.target.value)
            }}
            placeholder="Buscar empleado..."
            className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <select value={deptFilter} onChange={e => handleDept(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white">
          {departments.map(d => <option key={d}>{d}</option>)}
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['#', 'Empleado', 'Depto.', 'Presentes', 'Retardos', 'Ausentes', 'Horas trabajadas'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row, idx) => (
                  <tr key={row.employeeId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-400 text-xs tabular-nums">
                      {(page - 1) * pageSize + idx + 1}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{row.fullName}</div>
                      <div className="text-xs text-gray-400 font-mono">{row.employeeCode}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{row.department}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">{row.present}</span>
                    </td>
                    <td className="px-4 py-3">
                      {row.late > 0
                        ? <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">{row.late}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {row.absent > 0
                        ? <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">{row.absent}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">{formatHours(row.totalHours)}</td>
                  </tr>
                ))}
                {rows.length > 0 && (
                  <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold">
                    <td className="px-4 py-3 text-gray-700" colSpan={3}>
                      Total página ({rows.length} empleados)
                    </td>
                    <td className="px-4 py-3 text-green-700">{totals.present}</td>
                    <td className="px-4 py-3 text-yellow-700">{totals.late}</td>
                    <td className="px-4 py-3 text-red-700">{totals.absent}</td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">{formatHours(totals.hours)}</td>
                  </tr>
                )}
                {rows.length === 0 && !loading && (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400 text-sm">Sin resultados para el período seleccionado</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <Pagination
          page={page}
          totalPages={result?.totalPages ?? 1}
          totalCount={result?.totalCount ?? 0}
          pageSize={pageSize}
          onPageChange={setPage}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onPageSizeChange={handlePageSize}
        />
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AttendancePage() {
  const _user    = useAuthStore(s => s.user)
  const timeZone = _user?.timeZone ?? 'America/Guayaquil'
  const locale   = countryToLocale(_user?.country ?? 'EC')
  const fmt      = (iso?: string) => formatTime(iso, timeZone, locale)
  const [view,         setView]         = useState<'day' | 'period'>('day')
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [page,         setPage]         = useState(1)
  const [pageSize,     setPageSize]     = useState(10)
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [deptFilter,   setDeptFilter]   = useState('Todos')
  const [result,       setResult]       = useState<PagedResult<AttendanceDayRow> | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [departments,  setDepartments]  = useState<string[]>(['Todos'])
  const [actionError,  setActionError]  = useState<string | null>(null)

  // Para modales — el "employee" se construye desde el row de asistencia
  const [originsTarget,  setOriginsTarget]  = useState<AttendanceDayRow | null>(null)
  const [checkOutTarget, setCheckOutTarget] = useState<AttendanceDayRow | null>(null)
  const [historyTarget,  setHistoryTarget]  = useState<Employee | null>(null)
  const [editTarget,     setEditTarget]     = useState<AttendanceDayRow | null>(null)
  const [savingAction,   setSavingAction]   = useState<string | null>(null)

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const dateStr = toLocalDateString(selectedDate)
  const isToday = dateStr === toLocalDateString(new Date())

  function runTour() {
    createTour([
      { element: '#tour-att-toggle',  title: 'Vista Día / Período',    description: 'Cambia entre la vista de un día específico y un resumen por período. En vista Día registras entradas y salidas; en vista Período ves totales de horas y estados por rango de fechas.' },
      { element: '#tour-att-stats',   title: 'Estadísticas del día',   description: 'Tarjetas de resumen: presentes, tarde, ausentes y sin registro. Haz clic en una tarjeta para filtrar la tabla por ese estado.' },
      { element: '#tour-att-filters', title: 'Filtros',                description: 'Busca por nombre de empleado, filtra por departamento o por estado de asistencia.' },
      { element: '#tour-att-table',   title: 'Lista de asistencia',    description: 'Aquí aparecen todos los empleados con su estado del día. Puedes registrar entrada/salida manualmente con los botones de cada fila y consultar el historial de marcaciones.' },
    ]).drive()
  }

  // Cargar departamentos una vez
  useEffect(() => {
    employeeService.getAll().then(emps => {
      const depts = Array.from(new Set(emps.map(e => e.departmentName).filter(Boolean))).sort() as string[]
      setDepartments(['Todos', ...depts])
    }).catch(() => {})
  }, [])

  const load = useCallback(() => {
    if (view !== 'day') return
    setLoading(true); setActionError(null)
    attendanceService.getDayView({
      date: dateStr,
      page, pageSize,
      search:     search     || undefined,
      department: deptFilter !== 'Todos' ? deptFilter : undefined,
      status:     statusFilter !== 'All' ? statusFilter : undefined,
    }).then(setResult).catch(() => {}).finally(() => setLoading(false))
  }, [view, dateStr, page, pageSize, search, statusFilter, deptFilter])

  useEffect(() => { if (view === 'day') load() }, [load, view])

  // Stats reales del día sin filtros de status
  const [dayStats, setDayStats] = useState({ present: 0, late: 0, absent: 0, noRecord: 0 })
  useEffect(() => {
    if (view !== 'day') return
    attendanceService.getDayView({ date: dateStr, page: 1, pageSize: 500 }).then(r => {
      const rows = r.items
      setDayStats({
        present:  rows.filter(row => row.statusKey === 'Present').length,
        late:     rows.filter(row => row.statusKey === 'Late').length,
        absent:   rows.filter(row => row.statusKey === 'Absent').length,
        noRecord: rows.filter(row => row.statusKey === 'None').length,
      })
    }).catch(() => {})
  }, [dateStr, view])

  const rows = result?.items ?? []

  const prevDay = () => { const d = new Date(selectedDate); d.setDate(d.getDate()-1); setSelectedDate(d); setPage(1) }
  const nextDay = () => { const d = new Date(selectedDate); d.setDate(d.getDate()+1); if (d <= new Date()) { setSelectedDate(d); setPage(1) } }

  const handleCheckIn = async (row: AttendanceDayRow) => {
    setSavingAction(row.employeeId); setActionError(null)
    try {
      await attendanceService.checkIn(row.employeeId)
      load()
      toast.success(`Entrada registrada para ${row.fullName}.`)
    }
    catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Error al registrar entrada.'
      setActionError(msg); toast.error(msg)
    }
    finally { setSavingAction(null) }
  }

  const handleCheckOut = async (notes: string) => {
    if (!checkOutTarget) return
    setSavingAction(checkOutTarget.employeeId); setActionError(null)
    try {
      await attendanceService.checkOut(checkOutTarget.employeeId, notes || undefined)
      setCheckOutTarget(null)
      load()
      toast.success(`Salida registrada para ${checkOutTarget.fullName}.`)
    }
    catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Error al registrar salida.'
      setActionError(msg); toast.error(msg)
    }
    finally { setSavingAction(null) }
  }

  const handleEdit = async (checkIn?: string, checkOut?: string, notes?: string) => {
    if (!editTarget?.attendanceId) return
    setSavingAction(editTarget.employeeId); setActionError(null)
    try {
      await attendanceService.update(editTarget.attendanceId, checkIn, checkOut, notes)
      setEditTarget(null)
      load()
      toast.success('Registro de asistencia actualizado.')
    }
    catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Error al actualizar el registro.'
      setActionError(msg); toast.error(msg)
    }
    finally { setSavingAction(null) }
  }

  const handleStatusFilter = (key: string) => {
    setStatusFilter(sf => sf === key ? 'All' : key)
    setPage(1)
  }

  const handlePageSize = (n: number) => {
    setPageSize(n)
    setPage(1)
  }

  return (
    <div className="space-y-5">

      {/* Header + toggle vista */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Asistencia</h1>
          <p className="text-gray-500 text-sm mt-0.5">Registro de asistencia</p>
          <div className="mt-1"><HelpButton onClick={runTour} /></div>
        </div>
        <div className="sm:ml-auto flex flex-wrap items-center gap-2">
          <div id="tour-att-toggle" className="flex rounded-lg border border-gray-300 overflow-hidden bg-white">
            <button
              onClick={() => setView('day')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${view === 'day' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              Día
            </button>
            <button
              onClick={() => setView('period')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${view === 'period' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              Período
            </button>
          </div>

          {view === 'day' && (
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={prevDay} className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50">
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
              <div className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white">
                <Calendar className="w-4 h-4 text-gray-400 shrink-0" />{dateStr}
              </div>
              <button onClick={nextDay} disabled={isToday} className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40">
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
              {!isToday && (
                <button onClick={() => { setSelectedDate(new Date()); setPage(1) }}
                  className="px-3 py-2 text-sm bg-primary-50 text-primary-700 border border-primary-200 rounded-lg hover:bg-primary-100">
                  Hoy
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Vista período */}
      {view === 'period' && <PeriodView />}

      {/* Vista día */}
      {view === 'day' && (
        <>
          {/* Stats */}
          <div id="tour-att-stats" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Presentes',    value: dayStats.present,  icon: UserCheck, color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-200',  key: 'Present' },
              { label: 'Tarde',        value: dayStats.late,     icon: Clock,     color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', key: 'Late'    },
              { label: 'Ausentes',     value: dayStats.absent,   icon: UserX,     color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-200',    key: 'Absent'  },
              { label: 'Sin registro', value: dayStats.noRecord, icon: Users,     color: 'text-gray-500',   bg: 'bg-gray-50',   border: 'border-gray-200',   key: 'None'    },
            ].map(({ label, value, icon: Icon, color, bg, border, key }) => (
              <button key={key} onClick={() => handleStatusFilter(key)}
                className={`rounded-xl border p-4 flex items-center gap-3 transition-all text-left ${border} ${
                  statusFilter === key ? 'ring-2 ring-primary-400 bg-primary-50' : 'bg-white hover:shadow-sm'}`}>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${bg}`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">{value}</p>
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Error banner */}
          {actionError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center justify-between">
              {actionError}
              <button onClick={() => setActionError(null)} className="ml-3 p-1 hover:bg-red-100 rounded"><X className="w-4 h-4" /></button>
            </div>
          )}

          {/* Filtros + selector de tamaño */}
          <div id="tour-att-filters" className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[160px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                placeholder="Buscar empleado..."
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                onChange={e => {
                  const val = e.target.value
                  if (searchTimer.current) clearTimeout(searchTimer.current)
                  searchTimer.current = setTimeout(() => { setSearch(val); setPage(1) }, 300)
                }}
              />
            </div>
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white">
              <option value="All">Todos los estados</option>
              <option value="Present">Presente</option>
              <option value="Late">Tarde</option>
              <option value="Absent">Ausente</option>
              <option value="None">Sin registro</option>
            </select>
            <select value={deptFilter} onChange={e => { setDeptFilter(e.target.value); setPage(1) }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white">
              {departments.map(d => <option key={d}>{d}</option>)}
            </select>
            {(search || statusFilter !== 'All' || deptFilter !== 'Todos') && (
              <button onClick={() => { setSearch(''); setStatusFilter('All'); setDeptFilter('Todos'); setPage(1) }}
                className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-100">
                Limpiar filtros
              </button>
            )}
          </div>

          {/* Tabla */}
          <div id="tour-att-table" className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></div>
            ) : rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                <Calendar className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-sm">Sin resultados</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {['#', 'Empleado', 'Depto.', 'Estado', 'Entrada', 'Salida', 'Horas', 'Origen', 'Acciones'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rows.map((row, idx) => {
                      const isSaving    = savingAction === row.employeeId
                      const canCheckIn  = isToday && !row.attendanceId
                      const canCheckOut = isToday && row.attendanceId && !row.checkOutTime
                      return (
                        <tr key={row.employeeId} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-gray-400 text-xs tabular-nums">
                            {(page - 1) * pageSize + idx + 1}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{row.fullName}</div>
                            <div className="text-xs text-gray-400 font-mono">{row.employeeCode}</div>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{row.department}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[row.statusKey] ?? STATUS_BADGE.None}`}>
                              {row.statusLabel}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600 font-mono text-xs">{fmt(row.checkInTime)}</td>
                          <td className="px-4 py-3 text-gray-600 font-mono text-xs">{fmt(row.checkOutTime)}</td>
                          <td className="px-4 py-3 text-gray-600 text-xs">{formatHours(row.hoursWorked)}</td>
                          <td className="px-4 py-3">
                            {row.records.length === 0 ? (
                              <span className="text-gray-300 text-xs">—</span>
                            ) : (
                              <button
                                onClick={() => setOriginsTarget(row)}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 text-xs text-gray-600 hover:text-primary-700 transition-all"
                              >
                                <OriginIcon from={row.records[0].registeredFrom} />
                                {row.records.length > 1
                                  ? <span>{row.records.length} registros</span>
                                  : <span>{ORIGIN_LABEL[row.records[0].registeredFrom] ?? row.records[0].registeredFrom}</span>
                                }
                                {row.records.some(r => r.latitude != null) && (
                                  <MapPin className="w-3 h-3 text-red-400" />
                                )}
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              {canCheckIn && (
                                <button onClick={() => handleCheckIn(row)} disabled={isSaving} title="Registrar entrada"
                                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-xs font-medium disabled:opacity-50">
                                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogIn className="w-3.5 h-3.5" />}
                                  Entrada
                                </button>
                              )}
                              {canCheckOut && (
                                <button onClick={() => setCheckOutTarget(row)} disabled={isSaving} title="Registrar salida"
                                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-medium disabled:opacity-50">
                                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
                                  Salida
                                </button>
                              )}
                              {row.attendanceId && (
                                <button onClick={() => setEditTarget(row)} title="Corregir registro"
                                  className="p-1.5 rounded hover:bg-amber-50 text-amber-500 hover:text-amber-700 transition-colors">
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {row.notes && (
                                <div title={row.notes} className="p-1.5 text-gray-400 cursor-help">
                                  <FileText className="w-3.5 h-3.5" />
                                </div>
                              )}
                              <button
                                onClick={() => setHistoryTarget({
                                  id: row.employeeId,
                                  employeeCode: row.employeeCode,
                                  fullName: row.fullName,
                                  departmentName: row.department,
                                } as unknown as Employee)}
                                title="Ver historial"
                                className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                                <History className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <Pagination
              page={page}
              totalPages={result?.totalPages ?? 1}
              totalCount={result?.totalCount ?? 0}
              pageSize={pageSize}
              onPageChange={setPage}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageSizeChange={handlePageSize}
            />
          </div>
        </>
      )}

      {/* Modales */}
      {originsTarget && (
        <OriginsModal row={originsTarget} onClose={() => setOriginsTarget(null)} />
      )}
      {checkOutTarget && (
        <CheckOutModal
          employee={{ id: checkOutTarget.employeeId, fullName: checkOutTarget.fullName } as Employee}
          onConfirm={handleCheckOut}
          onClose={() => setCheckOutTarget(null)}
          saving={savingAction === checkOutTarget.employeeId}
        />
      )}
      {historyTarget && (
        <HistoryModal employee={historyTarget} onClose={() => setHistoryTarget(null)} />
      )}
      {editTarget && (
        <EditRecordModal
          record={editTarget}
          date={dateStr}
          onSave={handleEdit}
          onClose={() => setEditTarget(null)}
          saving={!!savingAction}
        />
      )}
    </div>
  )
}
