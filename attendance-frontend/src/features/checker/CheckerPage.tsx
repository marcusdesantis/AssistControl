import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { Clock, LogIn, LogOut, CheckCircle, XCircle, AlertCircle, Settings, X, Users, Mail, BarChart2, List, Eye, EyeOff, Loader2, Lock, HelpCircle } from 'lucide-react'
import { checkerService } from './checkerService'
import { createTour } from '@/utils/tour'
import type { CheckerEmployeeReport, CheckerReportDay } from './checkerService'
import { messageService } from '../messages/messageService'
import Pagination from '@/components/Pagination'
import type { AttendanceRecord } from '@/types/attendance'
import type { EmployeeMessage, EmployeeStats } from '@/types/message'

const FEED_PAGE_SIZE_OPTIONS = [10, 20, 50]

// ─── Sound ────────────────────────────────────────────────────────────────────
function playSound(type: 'success' | 'error' | 'notify') {
  try {
    const ctx  = new AudioContext()
    const gain = ctx.createGain()
    gain.connect(ctx.destination)

    if (type === 'success') {
      // Dos tonos ascendentes (ding-ding)
      [0, 0.18].forEach((offset, i) => {
        const osc = ctx.createOscillator()
        osc.connect(gain)
        osc.frequency.value = i === 0 ? 880 : 1100
        osc.type = 'sine'
        gain.gain.setValueAtTime(0.25, ctx.currentTime + offset)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.25)
        osc.start(ctx.currentTime + offset)
        osc.stop(ctx.currentTime + offset + 0.25)
      })
    } else if (type === 'error') {
      // Tono grave descendente (error)
      const osc = ctx.createOscillator()
      osc.connect(gain)
      osc.frequency.setValueAtTime(400, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.4)
      osc.type = 'sawtooth'
      gain.gain.setValueAtTime(0.2, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.4)
    } else {
      // Tono suave de notificación (actualización del tablero)
      const osc = ctx.createOscillator()
      osc.connect(gain)
      osc.frequency.value = 660
      osc.type = 'sine'
      gain.gain.setValueAtTime(0.12, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.3)
    }
  } catch { /* AudioContext no disponible */ }
}

// ─── Message Modal (checador) ─────────────────────────────────────────────────
function CheckerMessageModal({
  messages,
  checkerKey,
  onClose,
}: {
  messages:   EmployeeMessage[]
  checkerKey: string
  onClose:    () => void
}) {
  const [index,    setIndex]    = useState(0)
  const [handling, setHandling] = useState(false)

  const msg = messages[index]

  // Marcar como leído automáticamente al mostrar cada mensaje
  useEffect(() => {
    if (!msg) return
    messageService.markReadChecker(msg.id, checkerKey).catch(() => {})
  }, [msg?.id, checkerKey])

  if (!msg) { onClose(); return null }

  const next = () => {
    if (index + 1 < messages.length) setIndex(index + 1)
    else onClose()
  }

  const handleAcceptAndDelete = async () => {
    if (!msg.allowDelete) { next(); return }
    setHandling(true)
    try { await messageService.deleteChecker(msg.id, checkerKey) } catch { /* ignorar */ }
    finally { setHandling(false); next() }
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: '2-digit' })

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center gap-3 p-4 bg-primary-700 text-white rounded-t-2xl">
          <Mail className="w-5 h-5 shrink-0" />
          <span className="font-semibold">Mensaje</span>
          {messages.length > 1 && (
            <span className="ml-auto text-xs bg-white/20 px-2 py-0.5 rounded-full">
              {index + 1} / {messages.length}
            </span>
          )}
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            <span className="text-gray-500 font-medium">Para:</span>
            <span className="text-gray-900 font-semibold">{msg.employeeName}</span>
            <span className="text-gray-500 font-medium">De:</span>
            <span className="text-gray-900">{msg.senderName}</span>
            <span className="text-gray-500 font-medium">Fecha:</span>
            <span className="text-gray-900">{formatDate(msg.createdAt)}</span>
            <span className="text-gray-500 font-medium">Asunto:</span>
            <span className="text-gray-900 font-medium">{msg.subject}</span>
          </div>
          <div className="border rounded-lg p-3 min-h-[80px] bg-gray-50 text-sm text-gray-800 whitespace-pre-wrap">
            {msg.body}
          </div>
        </div>
        <div className="flex gap-3 p-4 border-t justify-end">
          <button onClick={next} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
            Cerrar
          </button>
          {msg.allowDelete && (
            <button onClick={handleAcceptAndDelete} disabled={handling}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white rounded-lg text-sm font-medium">
              Aceptar y borrar mensaje
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const CHECKER_KEY_STORAGE = 'checker_key'

function formatTime(iso?: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hour12: true })
}


function formatPeriod(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('es-EC', { month: 'short', day: 'numeric' })
}

const STATUS_LABEL: Record<string, string> = {
  Present: 'Presente',
  Late:    'Tarde',
  Absent:  'Ausente',
  HalfDay: 'Medio Día',
}

// ─── Report helpers ───────────────────────────────────────────────────────────
function fmtMins(mins: number): string {
  const sign = mins < 0 ? '-' : ''
  const abs  = Math.abs(mins)
  const h    = Math.floor(abs / 60)
  const m    = abs % 60
  return `${sign}${h}:${String(m).padStart(2, '0')}`
}

function fmtTimeOnly(t?: string): string {
  if (!t) return '—'
  const [h, m] = t.split(':').map(Number)
  const suffix = h >= 12 ? 'pm' : 'am'
  const h12    = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')}${suffix}`
}

function todayStr() { return new Date().toISOString().slice(0, 10) }
function firstOfMonthStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function DayStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Asistido:       'bg-green-100 text-green-700',
    Retardo:        'bg-yellow-100 text-yellow-700',
    'Medio Día':    'bg-blue-100 text-blue-700',
    Falta:          'bg-red-100 text-red-700',
    Descanso:       'bg-gray-100 text-gray-500',
    'Sin registro': 'bg-gray-100 text-gray-400',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  )
}

function DayRow({ day }: { day: CheckerReportDay }) {
  const isRest   = day.dayStatus === 'Descanso'
  const isAbsent = day.dayStatus === 'Falta'
  const dateFmt  = new Date(day.date + 'T00:00:00').toLocaleDateString('es-MX', {
    month: 'short', day: 'numeric', year: '2-digit',
  })
  const rowCls = isRest
    ? 'bg-gray-50/60 text-gray-400'
    : isAbsent ? 'bg-red-50/40' : 'hover:bg-primary-50/30'

  return (
    <tr className={`transition-colors ${rowCls}`}>
      <td className="px-3 py-2 whitespace-nowrap font-medium text-gray-700">{dateFmt}</td>
      <td className="px-3 py-2 whitespace-nowrap text-gray-500">{day.dayName}</td>
      <td className="px-3 py-2 font-mono whitespace-nowrap">{fmtTimeOnly(day.checkIn)}</td>
      <td className="px-3 py-2 font-mono whitespace-nowrap">{fmtTimeOnly(day.checkOut)}</td>
      <td className="px-3 py-2 font-mono whitespace-nowrap">
        {day.workedMinutes != null ? fmtMins(day.workedMinutes) : '—'}
      </td>
      <td className="px-3 py-2 font-mono whitespace-nowrap">
        {day.scheduledMinutes != null && day.isWorkDay ? fmtMins(day.scheduledMinutes) : '—'}
      </td>
      <td className={`px-3 py-2 font-mono whitespace-nowrap font-semibold
        ${day.balanceMinutes != null && day.balanceMinutes < 0 ? 'text-red-500' : 'text-green-600'}`}>
        {day.balanceMinutes != null ? fmtMins(day.balanceMinutes) : '—'}
      </td>
      <td className="px-3 py-2 font-mono whitespace-nowrap text-yellow-600">
        {day.delayMinutes ? `${day.delayMinutes} min` : '—'}
      </td>
      <td className="px-3 py-2 font-mono whitespace-nowrap text-orange-500">
        {day.earlyLeaveMinutes ? `${day.earlyLeaveMinutes} min` : '—'}
      </td>
      <td className="px-3 py-2 whitespace-nowrap"><DayStatusBadge status={day.dayStatus} /></td>
    </tr>
  )
}

// ─── Report view (right panel when tab = 'report') ───────────────────────────
interface ReportPanelProps {
  checkerKey:   string
  employeeId:   string
  employeeName: string
  onBack:       () => void
}

function ReportPanel({ checkerKey, employeeId, employeeName, onBack }: ReportPanelProps) {
  const [loading, setLoading] = useState(false)
  const [report,  setReport]  = useState<CheckerEmployeeReport | null>(null)
  const [error,   setError]   = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await checkerService.getEmployeeReport(
        checkerKey, employeeId, firstOfMonthStr(), todayStr()
      )
      setReport(data)
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'No se pudo obtener el reporte.')
    } finally {
      setLoading(false)
    }
  }, [checkerKey, employeeId])

  useEffect(() => { load() }, [load])

  const fmtDate = (iso: string) =>
    new Date(iso + 'T00:00:00').toLocaleDateString('es-MX', { month: 'short', day: 'numeric', year: '2-digit' })

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack}
            className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 font-medium shrink-0">
            <X className="w-3.5 h-3.5" /> Volver
          </button>
          <div className="h-4 w-px bg-gray-300 shrink-0" />
          <span className="text-sm font-semibold text-gray-800 truncate">{employeeName}</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {loading && !report && (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">Generando reporte…</div>
        )}
        {error && (
          <div className="flex items-center justify-center h-full">
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        )}
        {report && (
          <div className="p-4 space-y-4 text-sm">
            {/* Header */}
            <div className="bg-primary-50 border border-primary-100 rounded-xl p-4">
              <p className="text-xs font-semibold text-primary-400 uppercase tracking-wide mb-1">
                01 Reporte general de asistencia ({fmtDate(report.from)} – {fmtDate(report.to)})
              </p>
              <p className="font-bold text-primary-900 text-lg">{report.employeeName}</p>
              <p className="text-primary-600 text-xs mt-0.5">{report.employeeCode} · {report.department}</p>
              <p className="text-gray-500 text-xs mt-1">
                Horario: <span className="font-medium text-gray-700">{report.scheduleName}</span>
              </p>
            </div>

            {/* Days table */}
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-xs min-w-[700px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Fecha','Día','Entrada','Salida','Trabajado','Debe','Balance','Retardo','Sal. Pre.','Estatus'].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {report.days.map((d, i) => <DayRow key={i} day={d} />)}
                </tbody>
              </table>
            </div>

            {/* Tiempo total */}
            <div className="bg-gray-50 rounded-xl border border-gray-200 px-4 py-3 flex items-center justify-between">
              <span className="font-semibold text-gray-700">Tiempo total laborado</span>
              <span className="font-bold text-primary-700 font-mono">
                {fmtMins(report.totalWorkedMinutes)}
                <span className="text-gray-400 text-xs ml-1">[{(report.totalWorkedMinutes/60).toFixed(2)}]</span>
              </span>
              <span className="text-gray-500 text-xs font-medium">{report.attendancePercent.toFixed(2)} %</span>
            </div>

            {/* Columnas sin/con faltas */}
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-3 py-2 text-left font-semibold text-gray-500 w-28">Tiempo</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-500">Sin tomar en cuenta faltas de asistencia</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-500">Tomando en cuenta faltas de asistencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[
                    { label: 'A laborar', noAbs: report.scheduledMinutesNoAbsences,   withAbs: report.scheduledMinutesWithAbsences,   colored: false },
                    { label: 'Extra',     noAbs: report.extraMinutesNoAbsences,        withAbs: report.extraMinutesWithAbsences,        colored: false },
                    { label: 'A favor',   noAbs: report.balanceMinutesNoAbsences,      withAbs: report.balanceMinutesWithAbsences,      colored: true  },
                  ].map(({ label, noAbs, withAbs, colored }) => (
                    <tr key={label}>
                      <td className="px-3 py-2.5 font-medium text-gray-600">{label}</td>
                      <td className={`px-3 py-2.5 font-mono ${colored && noAbs < 0 ? 'text-red-600 font-semibold' : colored && noAbs >= 0 ? 'text-green-600 font-semibold' : ''}`}>
                        {fmtMins(noAbs)} <span className="text-gray-400">[{(noAbs/60).toFixed(2)}]</span>
                      </td>
                      <td className={`px-3 py-2.5 font-mono ${colored && withAbs < 0 ? 'text-red-600 font-semibold' : colored && withAbs >= 0 ? 'text-green-600 font-semibold' : ''}`}>
                        {fmtMins(withAbs)} <span className="text-gray-400">[{(withAbs/60).toFixed(2)}]</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Resumen del período */}
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-gray-700 text-white text-xs font-semibold px-3 py-2 text-center uppercase tracking-wide">
                Resumen del período
              </div>
              <div className="grid grid-cols-2 gap-px bg-gray-200">
                {([
                  ['Días laborables asistidos', `${report.workdaysAttended} de ${report.totalWorkdays}`, false],
                  ['Retardos totales',           report.totalLates,           report.totalLates > 0],
                  ['Faltas de asistencia',       report.totalAbsences,        report.totalAbsences > 0],
                  ['Salidas prematuras totales', report.totalEarlyDepartures, report.totalEarlyDepartures > 0],
                  ['Eventos incompletos',        report.incompleteEvents,     report.incompleteEvents > 0],
                  ['% Asistencia',               `${report.attendancePercent.toFixed(1)}%`, false],
                ] as [string, string|number, boolean][]).map(([label, value, highlight]) => (
                  <div key={label} className="bg-white px-3 py-2.5 flex items-center justify-between">
                    <span className="text-gray-500 text-xs">{label}</span>
                    <span className={`font-bold text-sm ${highlight ? 'text-red-600' : 'text-gray-800'}`}>{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Setup Modal ──────────────────────────────────────────────────────────────
function SetupModal({ onSave }: { onSave: (key: string) => void }) {
  const [value,   setValue]   = useState('')
  const [showKey, setShowKey] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const handleSubmit = async () => {
    const key = value.trim()
    if (!key) return
    setLoading(true)
    setError(null)
    try {
      await checkerService.getFeed(key)   // valida la clave antes de guardar
      onSave(key)
    } catch (err: any) {
      const d = err?.response?.data
      const code = d?.code ?? d?.errorCode
      setError(
        code === 'INVALID_CHECKER_KEY'
          ? 'Clave incorrecta. Verifica e intenta de nuevo.'
          : code === 'TENANT_INACTIVE'
          ? 'Esta empresa está desactivada. Contacta al administrador del sistema.'
          : 'No se pudo conectar con el servidor.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-xl text-center">
        <div className="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Settings className="w-7 h-7 text-primary-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Configurar Checador</h2>
        <p className="text-gray-500 text-sm mb-6">
          Ingresa la <strong>clave del checador</strong>
        </p>
        <div className="relative mb-1">
          <input
            type={showKey ? 'text' : 'password'}
            value={value}
            onChange={e => { setValue(e.target.value); setError(null) }}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="••••••••"
            disabled={loading}
            className={`w-full border rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono ${
              error ? 'border-red-400 bg-red-50' : 'border-gray-300'
            }`}
          />
          <button
            type="button"
            onClick={() => setShowKey(s => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {error && (
          <p className="text-xs text-red-500 mb-3 text-left">{error}</p>
        )}
        {!error && <div className="mb-4" />}
        <button
          onClick={handleSubmit}
          disabled={!value.trim() || loading}
          className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-200 disabled:text-gray-400 text-white py-2.5 rounded-lg font-medium transition-colors"
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" />Verificando…</>
            : 'Guardar y continuar'}
        </button>
      </div>
    </div>
  )
}

// ─── Feedback overlay ─────────────────────────────────────────────────────────
type FeedbackState = {
  type:     'success-in' | 'success-out' | 'error'
  name?:    string
  time?:    string
  status?:  string
  message?: string
}

function FeedbackOverlay({ fb, onClose }: { fb: FeedbackState; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [onClose])

  const isSuccess = fb.type !== 'error'
  return (
    <div className={`absolute inset-x-0 top-0 z-20 mx-4 mt-4 rounded-xl p-4 shadow-lg flex items-start gap-3 border
      ${isSuccess ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
      {isSuccess
        ? <CheckCircle className="w-7 h-7 text-green-500 shrink-0 mt-0.5" />
        : <XCircle     className="w-7 h-7 text-red-500 shrink-0 mt-0.5"   />
      }
      <div className="flex-1">
        {isSuccess ? (
          <>
            <p className="font-bold text-gray-900">{fb.name}</p>
            <p className="text-gray-600 text-sm mt-0.5">
              {fb.type === 'success-in' ? 'Entrada' : 'Salida'} registrada a las{' '}
              <span className="font-semibold text-primary-700">{fb.time}</span>
            </p>
            {fb.status && (
              <span className={`inline-block mt-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium
                ${fb.status === 'Late' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                {STATUS_LABEL[fb.status] ?? fb.status}
              </span>
            )}
          </>
        ) : (
          <p className="font-medium text-red-700">{fb.message}</p>
        )}
      </div>
      <button onClick={onClose} className="p-1 hover:bg-black/5 rounded-lg">
        <X className="w-4 h-4 text-gray-400" />
      </button>
    </div>
  )
}

// ─── Main Kiosk Page ──────────────────────────────────────────────────────────
export default function CheckerPage() {
  const [checkerKey,    setCheckerKey]    = useState<string | null>(() => localStorage.getItem(CHECKER_KEY_STORAGE))
  const [planBlocked,   setPlanBlocked]   = useState<boolean | null>(null) // null = verificando
  const [deactivated,   _setDeactivated]  = useState(false)
  const [time,          setTime]          = useState(new Date())
  const [code,          setCode]          = useState('')
  const [pin,           setPin]           = useState('')
  const [loading,       setLoading]       = useState<'in' | 'out' | null>(null)
  const [feedback,      setFeedback]      = useState<FeedbackState | null>(null)
  const [feed,          setFeed]          = useState<AttendanceRecord[]>([])
  const [showSetup,     setShowSetup]     = useState(false)
  const [pendingMsgs,   setPendingMsgs]   = useState<EmployeeMessage[]>([])
  const [showMsgModal,  setShowMsgModal]  = useState(false)
  const [lastAction,    setLastAction]    = useState<{
    name: string; actionType: 'in' | 'out'; time: string; stats: EmployeeStats
  } | null>(null)
  const [feedPage,      setFeedPage]      = useState(1)
  const [feedPageSize,  setFeedPageSize]  = useState(20)
  const [activeTab,     setActiveTab]     = useState<'feed' | 'report'>('feed')
  const [reportTarget,  setReportTarget]  = useState<{ id: string; name: string } | null>(null)

  // ── OTP 2FA ──────────────────────────────────────────────────────────────────
  const [otpModal,      setOtpModal]      = useState(false)
  const [otpCode,       setOtpCode]       = useState('')
  const [otpEmail,      setOtpEmail]      = useState('')       // email enmascarado
  const [otpPending,    setOtpPending]    = useState<{ code: string; pin: string } | null>(null)
  const [otpLoading,    setOtpLoading]    = useState(false)
  const [otpError,      setOtpError]      = useState<string | null>(null)
  const [otpResending,  setOtpResending]  = useState(false)
  const [otpSending,    setOtpSending]    = useState(false)    // overlay pantalla completa

  const codeRef      = useRef<HTMLInputElement>(null)

  const invalidateSession = useCallback(() => {
    localStorage.removeItem(CHECKER_KEY_STORAGE)
    setCheckerKey(null)
  }, [])

  const loadFeed = useCallback(() => {
    if (!checkerKey) return
    checkerService.getFeed(checkerKey).then(data => {
      setFeed(data)
      setPlanBlocked(false)
    }).catch((err: any) => {
      const data = err?.response?.data
      const code = data?.code ?? data?.errorCode
      if (code === 'TENANT_INACTIVE')         invalidateSession()
      else if (code === 'INVALID_CHECKER_KEY') invalidateSession()
      else if (code === 'PLAN_LIMIT')          setPlanBlocked(true)
      else setPlanBlocked(false)
    })
  }, [checkerKey, invalidateSession])

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Polling cada 10 s + detección de clave eliminada desde otra pestaña
  useEffect(() => {
    if (!checkerKey) return
    loadFeed()
    const t = setInterval(loadFeed, 10_000)

    const onStorage = (e: StorageEvent) => {
      if (e.key === CHECKER_KEY_STORAGE && !e.newValue) invalidateSession()
    }
    window.addEventListener('storage', onStorage)

    return () => {
      clearInterval(t)
      window.removeEventListener('storage', onStorage)
    }
  }, [checkerKey, loadFeed, invalidateSession])


  const handleSaveTenant = (key: string) => {
    localStorage.setItem(CHECKER_KEY_STORAGE, key)
    setCheckerKey(key)
  }

  const resetForm = () => {
    setCode('')
    setPin('')
    setTimeout(() => codeRef.current?.focus(), 100)
  }

  const showError = (message: string) => {
    setFeedback({ type: 'error', message })
    resetForm()
  }

  const doAction = async (type: 'in' | 'out') => {
    if (!checkerKey || !code.trim() || !pin.trim()) return
    setLoading(type)
    setFeedback(null)
    try {
      // Solo el check-in tiene doble factor; el check-out no
      if (type === 'in') {
        // Intentar sin OTP primero; si el servidor responde OTP_REQUIRED, pedir código
        try {
          const result = await checkerService.checkIn(checkerKey, code.trim(), pin.trim())
          handleCheckInSuccess(result, type)
        } catch (innerErr: any) {
          if (innerErr?.response?.data?.errorCode === 'OTP_REQUIRED') {
            setOtpSending(true)
            try {
              const maskedEmail = await checkerService.requestOtp(checkerKey, code.trim(), pin.trim())
              setOtpPending({ code: code.trim(), pin: pin.trim() })
              setOtpEmail(maskedEmail)
              setOtpCode('')
              setOtpError(null)
              setOtpModal(true)
            } catch (otpErr: any) {
              const msg = otpErr?.response?.data?.message ?? 'No se pudo enviar el código de verificación.'
              showError(msg)
            } finally {
              setOtpSending(false)
            }
            return
          }
          throw innerErr
        }
      } else {
        const result = await checkerService.checkOut(checkerKey, code.trim(), pin.trim())
        handleCheckInSuccess(result, type)
      }
    } catch (err: any) {
      playSound('error')
      const d = err?.response?.data
      const errCode = d?.code ?? d?.errorCode
      if (errCode === 'INVALID_CHECKER_KEY') { invalidateSession(); return }
      if (errCode === 'TENANT_INACTIVE') { invalidateSession(); return }
      const msg = errCode === 'NO_SCHEDULE'
        ? 'Sin horario asignado. Solicita al administrador que te asigne un horario.'
        : (err?.response?.data?.message ?? 'Código o PIN incorrecto. Intenta de nuevo.')
      showError(msg)
    } finally {
      setLoading(null)
      resetForm()
    }
  }

  const handleCheckInSuccess = (result: Awaited<ReturnType<typeof checkerService.checkIn>>, type: 'in' | 'out') => {
    const rec = result.attendance
    playSound('success')
    setFeedback({
      type:   type === 'in' ? 'success-in' : 'success-out',
      name:   rec.employeeName,
      time:   formatTime(type === 'in' ? rec.checkInTime : rec.checkOutTime),
      status: rec.status,
    })
    setLastAction({
      name:       rec.employeeName,
      actionType: type,
      time:       formatTime(type === 'in' ? rec.checkInTime : rec.checkOutTime),
      stats:      result.stats,
    })
    if (result.pendingMessages?.length > 0) {
      setPendingMsgs(result.pendingMessages)
      setShowMsgModal(true)
    }
    loadFeed()
    setFeedPage(1)
  }

  const submitOtp = async () => {
    if (!checkerKey || !otpPending || !otpCode.trim()) return
    setOtpLoading(true)
    setOtpError(null)
    try {
      const result = await checkerService.checkIn(checkerKey, otpPending.code, otpPending.pin, otpCode.trim())
      setOtpModal(false)
      setOtpPending(null)
      handleCheckInSuccess(result, 'in')
    } catch (err: any) {
      const errCode = err?.response?.data?.errorCode
      if (errCode === 'INVALID_CHECKER_KEY') { invalidateSession(); return }
      setOtpError(
        errCode === 'OTP_INVALID'
          ? 'Código incorrecto o expirado. Intenta de nuevo.'
          : (err?.response?.data?.message ?? 'Error al verificar el código.')
      )
      playSound('error')
    } finally {
      setOtpLoading(false)
    }
  }

  const resendOtp = async () => {
    if (!checkerKey || !otpPending) return
    setOtpResending(true)
    setOtpError(null)
    try {
      const maskedEmail = await checkerService.requestOtp(checkerKey, otpPending.code, otpPending.pin)
      setOtpEmail(maskedEmail)
      setOtpCode('')
    } catch (err: any) {
      setOtpError(err?.response?.data?.message ?? 'Error al reenviar el código.')
    } finally {
      setOtpResending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && code && pin) doAction('in')
  }

  const openReport = useCallback((id: string, name: string) => {
    setReportTarget({ id, name })
    setActiveTab('report')
  }, [])

  // Precalcular todas las filas (aplanar en eventos individuales, luego ordenar por hora real)
  const allFeedRows = useMemo(() => {
    // 1. Convertir cada registro en eventos individuales (entrada y/o salida)
    type FeedEvent = { key: string; time: string; r: typeof feed[0]; type: 'in' | 'out' }
    const events: FeedEvent[] = []
    for (const r of feed) {
      if (r.checkInTime)  events.push({ key: `${r.id}-in`,  time: r.checkInTime,  r, type: 'in'  })
      if (r.checkOutTime) events.push({ key: `${r.id}-out`, time: r.checkOutTime, r, type: 'out' })
    }

    // 2. Ordenar todos los eventos por su hora real (más reciente primero)
    events.sort((a, b) => b.time.localeCompare(a.time))

    // 3. Renderizar cada evento como una fila
    return events.map(({ key, r, type }, idx) => {
      const handleClick = () => openReport(r.employeeId, r.employeeName)
      const n = idx + 1

      if (type === 'in') {
        return (
          <tr key={key}
            onClick={handleClick}
            title="Ver reporte"
            className="hover:bg-primary-50 cursor-pointer transition-colors group">
            <td className="px-4 py-3 text-gray-400 tabular-nums text-xs">{n}</td>
            <td className="px-4 py-3">
              <p className="font-medium text-gray-900 group-hover:text-primary-700">{r.employeeName}</p>
              <p className="text-xs text-gray-400">{r.department}</p>
            </td>
            <td className="px-4 py-3">
              <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs font-semibold px-2 py-1 rounded-full">
                <LogIn className="w-3 h-3" /> Entrada
              </span>
            </td>
            <td className="px-4 py-3 font-mono text-gray-700 text-sm">{formatTime(r.checkInTime)}</td>
            <td className="px-4 py-3">
              {r.status === 'Late' && r.lateMinutes > 0
                ? <span className="text-yellow-600 font-mono text-xs font-semibold">
                    {r.lateMinutes >= 60
                      ? `${Math.floor(r.lateMinutes / 60)}h ${r.lateMinutes % 60}m`
                      : `${r.lateMinutes} min`}
                  </span>
                : <span className="text-gray-300 text-xs">—</span>
              }
            </td>
          </tr>
        )
      } else {
        return (
          <tr key={key}
            onClick={handleClick}
            title="Ver reporte"
            className="hover:bg-primary-50 cursor-pointer transition-colors group">
            <td className="px-4 py-3 text-gray-400 tabular-nums text-xs">{n}</td>
            <td className="px-4 py-3">
              <p className="font-medium text-gray-900 group-hover:text-primary-700">{r.employeeName}</p>
              <p className="text-xs text-gray-400">{r.department}</p>
            </td>
            <td className="px-4 py-3">
              <span className="inline-flex items-center gap-1 bg-primary-50 text-primary-700 text-xs font-semibold px-2 py-1 rounded-full">
                <LogOut className="w-3 h-3" /> Salida
              </span>
            </td>
            <td className="px-4 py-3 font-mono text-gray-700 text-sm">{formatTime(r.checkOutTime)}</td>
            <td className="px-4 py-3 text-gray-300 text-xs">—</td>
          </tr>
        )
      }
    })
  }, [feed, openReport])

  // ── Early return: si no hay clave, mostrar modal de configuración ──────────
  if (!checkerKey) return <SetupModal onSave={handleSaveTenant} />

  // Estas son variables regulares (no hooks), pueden ir después del early return
  function runTour() {
    createTour([
      { element: '#checker-clock',   title: 'Reloj Checador',          description: 'Este es el reloj checador — el dispositivo donde los empleados registran su entrada y salida. Puede estar en una tablet o PC en la entrada de tu empresa.' },
      { element: '#checker-form',    title: 'Registro de asistencia',  description: 'El empleado ingresa su código (ej: EMP-001) y su PIN personal. Luego presiona ENTRADA al llegar o SALIDA al irse. Si el 2FA está activo, se enviará un código OTP al correo del empleado.' },
      { element: '#checker-buttons', title: 'Botones de acción',       description: 'ENTRADA: registra la hora de llegada. SALIDA: registra la hora de salida. El sistema calcula automáticamente si llegó tarde según el horario asignado.' },
      { element: '#checker-stats',   title: 'Resumen del día',         description: 'Contadores en tiempo real del día actual: cuántos empleados están presentes, con retardo y cuántos han registrado salida.' },
      { element: '#checker-feed',    title: 'Historial de registros',  description: 'Lista de todas las entradas y salidas del día, ordenadas de más reciente a más antigua. Haz clic en cualquier fila para ver el reporte detallado del empleado.' },
    ]).drive()
  }

  const timeStr    = time.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
  const dateStr    = time.toLocaleDateString('es-EC', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const present    = feed.filter(r => r.status === 'Present').length
  const late       = feed.filter(r => r.status === 'Late').length
  const checkedOut = feed.filter(r => r.checkOutTime).length

  const totalFeedRows = allFeedRows.length
  const pagedFeedRows = allFeedRows.slice((feedPage - 1) * feedPageSize, feedPage * feedPageSize)
  const feedTotalPages = Math.ceil(totalFeedRows / feedPageSize) || 1

  if (deactivated) return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl p-10 w-full max-w-sm text-center">
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <Lock className="w-7 h-7 text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Empresa desactivada</h2>
        <p className="text-gray-500 text-sm">
          Esta empresa ha sido desactivada por el administrador del sistema. El acceso al checador no está disponible.
        </p>
      </div>
    </div>
  )

  if (checkerKey && planBlocked === null) return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
    </div>
  )

  if (planBlocked === true) return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl p-10 w-full max-w-sm text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <Lock className="w-7 h-7 text-gray-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Función no disponible en tu plan
        </h2>
        <p className="text-gray-500 text-sm mb-6">
          El módulo de <span className="font-medium text-gray-700">Reloj Checador</span> no
          está incluido en tu plan actual. Mejora tu suscripción para desbloquearlo.
        </p>
        <a
          href="/settings?tab=subscription"
          className="inline-block px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          Ver planes disponibles
        </a>
      </div>
    </div>
  )

  return (
    <>
    <div className="h-screen bg-gray-100 flex flex-col select-none overflow-hidden">

      {/* ─── Header ──────────────────────────────────────────────── */}
      <header className="bg-primary-700 text-white px-6 py-3 flex items-center gap-3 shadow-md">
        <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
          <Clock className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-bold text-sm leading-tight">TiempoYa</p>
          <p className="text-primary-200 text-xs capitalize">{dateStr}</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-white/10 rounded-lg px-3 py-1.5">
            <Users className="w-3.5 h-3.5 text-primary-200" />
            <span className="text-sm font-medium">{feed.length} hoy</span>
          </div>
          <button
            onClick={() => setShowSetup(s => !s)}
            title="Configuración"
            className="p-2 rounded-lg hover:bg-white/10 text-primary-200 hover:text-white transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Setup panel */}
      {showSetup && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center gap-4">
          <span className="text-xs text-amber-700 font-semibold uppercase tracking-wider">Clave del Checador:</span>
          <span className="text-xs text-amber-800 font-mono">{checkerKey}</span>
          <button
            onClick={() => { localStorage.removeItem(CHECKER_KEY_STORAGE); setCheckerKey(null); setShowSetup(false) }}
            className="ml-auto text-xs text-red-600 hover:text-red-800 underline"
          >
            Cambiar clave
          </button>
        </div>
      )}

      {/* ─── Main area ───────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden min-h-0">

        {/* LEFT: Input panel */}
        <div className="relative lg:w-[400px] shrink-0 bg-white border-r border-gray-200 flex flex-col shadow-sm overflow-hidden min-h-0">

          {feedback && (
            <FeedbackOverlay fb={feedback} onClose={() => setFeedback(null)} />
          )}

          {/* Clock */}
          <div id="checker-clock" className="flex flex-col items-center justify-center pt-10 pb-6 px-8 bg-primary-50 border-b border-primary-100">
            <p className="text-5xl font-bold font-mono tracking-tight text-primary-800 tabular-nums">
              {timeStr}
            </p>
          </div>

          {/* Form */}
          <div id="checker-form" className="px-8 py-6 space-y-4 flex-1 overflow-y-auto min-h-0">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Número de empleado
              </label>
              <input
                ref={codeRef}
                value={code}
                onChange={e => { setCode(e.target.value.toUpperCase()); if (activeTab === 'report') setActiveTab('feed') }}
                onKeyDown={handleKeyDown}
                placeholder="EMP-001"
                autoComplete="off"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 text-lg font-mono
                           focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                           placeholder:text-gray-300 bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Clave (PIN)
              </label>
              <input
                value={pin}
                onChange={e => { setPin(e.target.value); if (activeTab === 'report') setActiveTab('feed') }}
                onKeyDown={handleKeyDown}
                type="password"
                inputMode="numeric"
                maxLength={6}
                placeholder="••••"
                autoComplete="off"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 text-lg
                           focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                           placeholder:text-gray-300 bg-gray-50"
              />
            </div>

            {/* Action buttons */}
            <div id="checker-buttons" className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => doAction('in')}
                disabled={!code || !pin || loading !== null}
                className="flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-base
                           bg-green-600 hover:bg-green-700 text-white
                           disabled:bg-gray-200 disabled:text-gray-400
                           transition-colors shadow-sm"
              >
                <LogIn className="w-5 h-5" />
                {loading === 'in' ? 'Registrando...' : 'ENTRADA'}
              </button>
              <button
                onClick={() => doAction('out')}
                disabled={!code || !pin || loading !== null}
                className="flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-base
                           bg-primary-600 hover:bg-primary-700 text-white
                           disabled:bg-gray-200 disabled:text-gray-400
                           transition-colors shadow-sm"
              >
                <LogOut className="w-5 h-5" />
                {loading === 'out' ? 'Registrando...' : 'SALIDA'}
              </button>
            </div>

            {/* Day stats */}
            <div id="checker-stats" className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100">
              {[
                { label: 'Presentes', value: present,    color: 'text-green-600',  bg: 'bg-green-50'  },
                { label: 'Retardos',  value: late,        color: 'text-yellow-600', bg: 'bg-yellow-50' },
                { label: 'Salidas',   value: checkedOut,  color: 'text-primary-600', bg: 'bg-primary-50' },
              ].map(({ label, value, color, bg }) => (
                <div key={label} className={`text-center pt-3 pb-1 rounded-lg ${bg}`}>
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ─── Barra de último registro ─────────────────────────── */}
          {lastAction && (
            <div className="border-t border-gray-200 bg-gray-50 px-5 py-3 text-xs shrink-0 flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-primary-800 mb-0.5">
                  <span className="text-gray-800">{lastAction.name}</span>{' '}
                  <span className={lastAction.actionType === 'in' ? 'text-green-600' : 'text-primary-600'}>
                    {lastAction.actionType === 'in' ? 'entrada' : 'salida'}
                  </span>{' '}
                  a las{' '}
                  <span className="font-bold text-primary-700">{lastAction.time}</span>
                </p>
                <p className="text-gray-400 text-[10px] mb-1.5">
                  ({formatPeriod(lastAction.stats.periodFrom)} – {formatPeriod(lastAction.stats.periodTo)})
                </p>
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="text-gray-600">
                    Retardos totales:{' '}
                    <span className={`font-bold ${lastAction.stats.totalLates > 0 ? 'text-yellow-600' : 'text-gray-500'}`}>
                      {lastAction.stats.totalLates}
                    </span>
                  </span>
                  <span className="text-gray-600">
                    Registros pendientes:{' '}
                    <span className={`font-bold ${lastAction.stats.pendingCheckouts > 0 ? 'text-orange-500' : 'text-gray-500'}`}>
                      {lastAction.stats.pendingCheckouts}
                    </span>
                  </span>
                  <span className="text-gray-600">
                    Faltas:{' '}
                    <span className={`font-bold ${lastAction.stats.absences > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                      {lastAction.stats.absences}
                    </span>
                  </span>
                </div>
              </div>
              <button
                onClick={() => setLastAction(null)}
                className="shrink-0 p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
                title="Cerrar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* RIGHT: Tabs — Feed / Reporte */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white min-h-0">

          {/* Tab bar */}
          <div className="flex items-center border-b border-gray-200 shrink-0">
            <button
              onClick={() => setActiveTab('feed')}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors
                ${activeTab === 'feed'
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              <List className="w-4 h-4" />
              Registros
              <span className="ml-1 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                {totalFeedRows}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('report')}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors
                ${activeTab === 'report'
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              <BarChart2 className="w-4 h-4" />
              Reporte
            </button>
            <button
              onClick={runTour}
              title="¿Cómo funciona?"
              className="ml-auto mr-4 flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-800 font-medium transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
              ¿Cómo funciona?
            </button>
          </div>

          {/* Feed tab */}
          {activeTab === 'feed' && (
            <>
              <div id="checker-feed" className="flex-1 overflow-y-auto min-h-0">
                {totalFeedRows === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <AlertCircle className="w-10 h-10 mb-3 opacity-30" />
                    <p className="text-sm">Sin registros por el momento</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white border-b border-gray-200 shadow-sm">
                      <tr>
                        {['#', 'Empleado', 'Tipo', 'Hora', 'Retardo'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {pagedFeedRows}
                    </tbody>
                  </table>
                )}
              </div>
              <Pagination
                page={feedPage}
                totalPages={feedTotalPages}
                totalCount={totalFeedRows}
                pageSize={feedPageSize}
                onPageChange={setFeedPage}
                pageSizeOptions={FEED_PAGE_SIZE_OPTIONS}
                onPageSizeChange={n => { setFeedPageSize(n); setFeedPage(1) }}
              />
            </>
          )}

          {/* Report tab */}
          {activeTab === 'report' && reportTarget && (
            <ReportPanel
              checkerKey={checkerKey!}
              employeeId={reportTarget.id}
              employeeName={reportTarget.name}
              onBack={() => setActiveTab('feed')}
            />
          )}
          {activeTab === 'report' && !reportTarget && (
            <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-3">
              <BarChart2 className="w-12 h-12" />
              <p className="text-sm text-gray-400">Selecciona un registro de la tabla para ver el reporte</p>
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Modal de mensajes pendientes */}
    {showMsgModal && checkerKey && (
      <CheckerMessageModal
        messages={pendingMsgs}
        checkerKey={checkerKey}
        onClose={() => { setShowMsgModal(false); setPendingMsgs([]) }}
      />
    )}

    {/* ── Overlay de carga OTP ────────────────────────────────────────────── */}
    {otpSending && (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-primary-900/80 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-5">
          {/* Anillo giratorio con colores del checker */}
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 rounded-full border-4 border-white/10" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-white animate-spin" />
            <div className="absolute inset-2 rounded-full bg-primary-700/60 flex items-center justify-center">
              <Clock className="w-7 h-7 text-white/80" />
            </div>
          </div>
          <div className="text-center space-y-1">
            <p className="text-white font-semibold text-base">Cargando</p>
            <p className="text-primary-200 text-sm">Por favor espere…</p>
          </div>
        </div>
      </div>
    )}

    {/* ── Modal OTP (doble factor) ─────────────────────────────────────────── */}
    {otpModal && (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-7 space-y-5">
          <div className="text-center space-y-1">
            <div className="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Mail className="w-7 h-7 text-primary-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Verificación requerida</h3>
            <p className="text-sm text-gray-500">
              Ingresa el código que enviamos a <span className="font-medium text-gray-700">{otpEmail}</span>
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              autoFocus
              value={otpCode}
              onChange={e => { setOtpCode(e.target.value.replace(/\D/g, '')); setOtpError(null) }}
              onKeyDown={e => e.key === 'Enter' && submitOtp()}
              placeholder="000000"
              className="w-full text-center text-3xl font-mono font-bold tracking-widest border-2 border-gray-300 rounded-xl px-4 py-4 focus:outline-none focus:border-primary-500"
            />
            {otpError && <p className="text-xs text-red-500 text-center">{otpError}</p>}
          </div>

          <button
            onClick={submitOtp}
            disabled={otpLoading || otpCode.length !== 6}
            className="w-full flex items-center justify-center gap-2 py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
          >
            {otpLoading
              ? <><Loader2 className="w-5 h-5 animate-spin" />Verificando…</>
              : 'Confirmar entrada'}
          </button>

          <div className="flex items-center justify-between text-xs text-gray-400">
            <button
              onClick={resendOtp}
              disabled={otpResending}
              className="hover:text-primary-600 disabled:opacity-50 transition-colors"
            >
              {otpResending ? 'Reenviando…' : 'Reenviar código'}
            </button>
            <button
              onClick={() => { setOtpModal(false); setOtpPending(null); setOtpCode('') }}
              className="hover:text-gray-600 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    )}
  </>
  )
}
