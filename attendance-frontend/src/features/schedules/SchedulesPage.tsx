import { useEffect, useState } from 'react'
import PlanGate from '@/components/PlanGate'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, X, Clock, Loader2, Users, CalendarDays, Copy, RefreshCw } from 'lucide-react'
import { isHandledError } from '@/services/api'
import { scheduleService } from './scheduleService'
import type { Schedule, ScheduleDayInput, CreateScheduleRequest, ScheduleType } from '@/types/schedule'
import { createTour } from '@/utils/tour'
import HelpButton from '@/components/HelpButton'

// ─── Constantes ───────────────────────────────────────────────────────────────

const DAYS = [
  { value: 1, label: 'Lunes'     },
  { value: 2, label: 'Martes'    },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves'    },
  { value: 5, label: 'Viernes'   },
  { value: 6, label: 'Sábado'    },
  { value: 0, label: 'Domingo'   },
]

const TYPE_OPTIONS: { value: ScheduleType; label: string; desc: string }[] = [
  { value: 'Fixed',    label: 'Fijo',      desc: 'Hora de entrada y salida definida por día.' },
  { value: 'Variable', label: 'Variable',  desc: 'Sin hora fija, el empleado debe cumplir un mínimo de horas diarias.' },
  { value: 'Rotativo', label: 'Rotativo',  desc: 'El horario cambia automáticamente cada semana (2 a 4 semanas).' },
]

const DEFAULT_DAY = (day: number): ScheduleDayInput => ({
  day,
  isWorkDay:       day >= 1 && day <= 5,
  entryTime:       '08:00',
  exitTime:        '17:00',
  hasLunch:        false,
  lunchStart:      '13:00',
  lunchEnd:        '14:00',
  requiredMinutes: 480,
})

const DEFAULT_DAYS  = (): ScheduleDayInput[] => DAYS.map(d => DEFAULT_DAY(d.value))
const DEFAULT_WEEKS = (n: number): ScheduleDayInput[][] => Array.from({ length: n }, DEFAULT_DAYS)

// ─── Helpers ──────────────────────────────────────────────────────────────────

// ─── DayTable ─────────────────────────────────────────────────────────────────

function DayTable({
  days,
  isVariable,
  onChange,
}: {
  days:       ScheduleDayInput[]
  isVariable: boolean
  onChange:   (idx: number, patch: Partial<ScheduleDayInput>) => void
}) {
  const copyFromFirst = () => {
    const firstIdx = days.findIndex(d => d.isWorkDay)
    if (firstIdx === -1) return
    const src = days[firstIdx]
    days.forEach((d, idx) => {
      if (idx === firstIdx || !d.isWorkDay) return
      if (isVariable) {
        onChange(idx, {
          entryTime:       src.entryTime,
          exitTime:        src.exitTime,
          requiredMinutes: src.requiredMinutes,
        })
      } else {
        onChange(idx, {
          entryTime:  src.entryTime,
          exitTime:   src.exitTime,
          hasLunch:   src.hasLunch,
          lunchStart: src.lunchStart,
          lunchEnd:   src.lunchEnd,
        })
      }
    })
  }

  return (
    <div>
      <div className="flex justify-end mb-2">
        <button
          type="button"
          onClick={copyFromFirst}
          disabled={!days.some(d => d.isWorkDay)}
          title="Replicar configuración del primer día activo a todos los demás"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          <Copy className="w-3.5 h-3.5" /> Replicar primer día
        </button>
      </div>

      <div className="border border-gray-200 rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-2 text-left text-xs text-gray-500 font-semibold w-28">Día</th>
              <th className="px-3 py-2 text-center text-xs text-gray-500 font-semibold w-10">Activo</th>
              {isVariable ? (
                <th className="px-3 py-2 text-xs text-gray-500 font-semibold">Horas por día</th>
              ) : (
                <>
                  <th className="px-3 py-2 text-xs text-gray-500 font-semibold">Entrada</th>
                  <th className="px-3 py-2 text-xs text-gray-500 font-semibold">Salida</th>
                  <th className="px-3 py-2 text-center text-xs text-gray-500 font-semibold">Comida</th>
                  <th className="px-3 py-2 text-xs text-gray-500 font-semibold">Sal. Comida</th>
                  <th className="px-3 py-2 text-xs text-gray-500 font-semibold">Reg. Comida</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {DAYS.map((dayDef, idx) => {
              const d = days[idx]
              if (!d) return null
              return (
                <tr key={dayDef.value} className={!d.isWorkDay ? 'opacity-50 bg-gray-50' : ''}>
                  <td className="px-3 py-2 font-medium text-sm">{dayDef.label}</td>
                  <td className="text-center">
                    <input type="checkbox" checked={d.isWorkDay}
                      onChange={e => onChange(idx, { isWorkDay: e.target.checked })}
                      className="w-4 h-4" />
                  </td>
                  {isVariable ? (
                    <td className="px-2 py-1">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number" min={0} max={24} step={0.5}
                          value={(d.requiredMinutes ?? 480) / 60}
                          disabled={!d.isWorkDay}
                          onChange={e => onChange(idx, { requiredMinutes: Math.round(Number(e.target.value) * 60) })}
                          className="border border-gray-300 rounded px-2 py-1 text-xs disabled:bg-gray-100 disabled:text-gray-400 w-20 text-center"
                        />
                        <span className="text-xs text-gray-500">h</span>
                      </div>
                    </td>
                  ) : (
                    <>
                      <td className="px-1 py-1">
                        <input type="time" value={d.entryTime ?? '08:00'} disabled={!d.isWorkDay}
                          onChange={e => onChange(idx, { entryTime: e.target.value })}
                          className="border border-gray-300 rounded px-1.5 py-1 text-xs disabled:bg-gray-100 disabled:text-gray-400 w-24" />
                      </td>
                      <td className="px-1 py-1">
                        <input type="time" value={d.exitTime ?? '17:00'} disabled={!d.isWorkDay}
                          onChange={e => onChange(idx, { exitTime: e.target.value })}
                          className="border border-gray-300 rounded px-1.5 py-1 text-xs disabled:bg-gray-100 disabled:text-gray-400 w-24" />
                      </td>
                      <td className="text-center">
                        <input type="checkbox" checked={d.hasLunch} disabled={!d.isWorkDay}
                          onChange={e => onChange(idx, { hasLunch: e.target.checked })}
                          className="w-4 h-4" />
                      </td>
                      <td className="px-1 py-1">
                        <input type="time" value={d.lunchStart ?? '13:00'}
                          disabled={!d.isWorkDay || !d.hasLunch}
                          onChange={e => onChange(idx, { lunchStart: e.target.value })}
                          className="border border-gray-300 rounded px-1.5 py-1 text-xs disabled:bg-gray-100 disabled:text-gray-400 w-24" />
                      </td>
                      <td className="px-1 py-1">
                        <input type="time" value={d.lunchEnd ?? '14:00'}
                          disabled={!d.isWorkDay || !d.hasLunch}
                          onChange={e => onChange(idx, { lunchEnd: e.target.value })}
                          className="border border-gray-300 rounded px-1.5 py-1 text-xs disabled:bg-gray-100 disabled:text-gray-400 w-24" />
                      </td>
                    </>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── ScheduleModal ────────────────────────────────────────────────────────────

function ScheduleModal({
  editing,
  onSave,
  onClose,
}: {
  editing: Schedule | null
  onSave:  (data: CreateScheduleRequest) => Promise<void>
  onClose: () => void
}) {
  const [name,      setName]      = useState(editing?.name ?? '')
  const [type,      setType]      = useState<ScheduleType>(editing?.type ?? 'Fixed')
  const [tolerance, setTolerance] = useState(editing?.lateToleranceMinutes ?? 0)
  const [rotWeeks,  setRotWeeks]  = useState(editing?.rotationWeeks ?? 2)
  const [activeWeek, setActiveWeek] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  // ── Estado Fixed / Variable ──
  const [days, setDays] = useState<ScheduleDayInput[]>(() => {
    if (!editing || editing.type === 'Rotativo') return DEFAULT_DAYS()
    const flat = editing.days as any[]
    return DAYS.map(d => {
      const found = flat.find((x: any) => x.day === d.value)
      return found
        ? { day: d.value, isWorkDay: found.isWorkDay, entryTime: found.entryTime ?? '08:00',
            exitTime: found.exitTime ?? '17:00', hasLunch: found.hasLunch,
            lunchStart: found.lunchStart ?? '13:00', lunchEnd: found.lunchEnd ?? '14:00',
            requiredMinutes: found.requiredMinutes ?? 480 }
        : DEFAULT_DAY(d.value)
    })
  })

  // ── Estado Rotativo ──
  const [weeks, setWeeks] = useState<ScheduleDayInput[][]>(() => {
    if (editing?.type === 'Rotativo') {
      const wks = editing.days as any[][]
      return wks.map(week =>
        DAYS.map(d => {
          const found = week.find((x: any) => x.day === d.value)
          return found
            ? { day: d.value, isWorkDay: found.isWorkDay, entryTime: found.entryTime ?? '08:00',
                exitTime: found.exitTime ?? '17:00', hasLunch: found.hasLunch,
                lunchStart: found.lunchStart ?? '13:00', lunchEnd: found.lunchEnd ?? '14:00' }
            : DEFAULT_DAY(d.value)
        })
      )
    }
    return DEFAULT_WEEKS(2)
  })

  // Ajustar semanas cuando cambia rotWeeks
  const handleRotWeeksChange = (n: number) => {
    setRotWeeks(n)
    setActiveWeek(prev => Math.min(prev, n - 1))
    setWeeks(prev => {
      if (n > prev.length) return [...prev, ...DEFAULT_WEEKS(n - prev.length)]
      return prev.slice(0, n)
    })
  }

  const updateDay = (idx: number, patch: Partial<ScheduleDayInput>) =>
    setDays(prev => prev.map((d, i) => i === idx ? { ...d, ...patch } : d))

  const updateWeekDay = (weekIdx: number, dayIdx: number, patch: Partial<ScheduleDayInput>) =>
    setWeeks(prev => prev.map((week, wi) =>
      wi === weekIdx ? week.map((d, di) => di === dayIdx ? { ...d, ...patch } : d) : week
    ))

  const validateDays = (dayList: ScheduleDayInput[], prefix = ''): string | null => {
    for (const d of dayList) {
      if (!d.isWorkDay) continue
      const label = (prefix ? prefix + ' — ' : '') + (DAYS.find(x => x.value === d.day)?.label ?? `Día ${d.day}`)
      if (type !== 'Variable') {
        if ((d.entryTime ?? '') >= (d.exitTime ?? ''))
          return `${label}: la hora de entrada debe ser menor que la de salida.`
        if (d.hasLunch) {
          const ls = d.lunchStart ?? '', le = d.lunchEnd ?? ''
          const et = d.entryTime ?? '', xt = d.exitTime ?? ''
          if (ls <= et || ls >= xt) return `${label}: inicio de comida debe estar entre entrada y salida.`
          if (le <= et || le > xt)  return `${label}: regreso de comida debe estar entre entrada y salida.`
          if (ls >= le)             return `${label}: inicio de comida debe ser menor que el regreso.`
        }
      }
    }
    return null
  }

  const handleSubmit = async () => {
    if (!name.trim()) { setError('El nombre es requerido.'); return }

    if (type === 'Rotativo') {
      for (let wi = 0; wi < weeks.length; wi++) {
        const err = validateDays(weeks[wi], `Horario ${wi + 1}`)
        if (err) { setError(err); return }
      }
    } else {
      const err = validateDays(days)
      if (err) { setError(err); return }
    }

    setSaving(true)
    setError(null)
    try {
      const base = { name: name.trim(), type, lateToleranceMinutes: type === 'Variable' ? 0 : tolerance }

      if (type === 'Variable') {
        await onSave({
          ...base,
          days: days.map(d => ({
            day:             d.day,
            isWorkDay:       d.isWorkDay,
            hasLunch:        false,
            requiredMinutes: d.isWorkDay ? (d.requiredMinutes ?? 480) : null,
          })),
        })
      } else if (type === 'Rotativo') {
        await onSave({
          ...base,
          rotationWeeks: rotWeeks,
          days: weeks.map(week =>
            week.map(d => ({
              ...d,
              entryTime:  d.isWorkDay ? d.entryTime  : null,
              exitTime:   d.isWorkDay ? d.exitTime   : null,
              lunchStart: d.isWorkDay && d.hasLunch ? d.lunchStart : null,
              lunchEnd:   d.isWorkDay && d.hasLunch ? d.lunchEnd   : null,
            }))
          ),
        })
      } else {
        await onSave({
          ...base,
          days: days.map(d => ({
            ...d,
            entryTime:  d.isWorkDay ? d.entryTime  : null,
            exitTime:   d.isWorkDay ? d.exitTime   : null,
            lunchStart: d.isWorkDay && d.hasLunch ? d.lunchStart : null,
            lunchEnd:   d.isWorkDay && d.hasLunch ? d.lunchEnd   : null,
          })),
        })
      }
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Error al guardar el horario.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" style={{ marginTop: 0 }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b shrink-0">
          <h2 className="text-lg font-semibold">{editing ? 'Editar Horario' : 'Nuevo Horario'}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto flex-1 min-h-0">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{error}</div>
          )}

          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del horario *</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="input-field" placeholder="Ej: Turno General, Turno Mañana..." />
          </div>

          {/* Tipo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de horario</label>
            <div className="space-y-2">
              {TYPE_OPTIONS.map(opt => (
                <label key={opt.value} className="flex items-start gap-3 cursor-pointer">
                  <input type="radio" checked={type === opt.value}
                    onChange={() => { setType(opt.value); setActiveWeek(0) }}
                    className="mt-0.5 w-4 h-4 text-primary-600" />
                  <div>
                    <span className="text-sm font-medium text-gray-800">{opt.label}:</span>{' '}
                    <span className="text-sm text-gray-500">{opt.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* ── Rotativo: configuración de rotación ── */}
          {type === 'Rotativo' && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-4">

              {/* Explicación */}
              <div className="bg-blue-100 border border-blue-200 rounded-lg p-3 space-y-1.5">
                <p className="text-xs font-semibold text-blue-800 flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5" /> ¿Cómo funciona el horario rotativo?
                </p>
                <ul className="text-xs text-blue-700 space-y-1 pl-1 list-disc list-inside">
                  <li>Define entre 2 y 4 horarios semanales.</li>
                  <li>El sistema los aplica en ciclo: Horario 1 → Horario 2 → … → vuelve al 1.</li>
                  <li>Cada horario tiene sus propios días y horas de entrada/salida.</li>
                  <li>El ciclo se calcula automáticamente desde la fecha de inicio del empleado.</li>
                </ul>
              </div>

              <div className="flex items-end gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Horarios a rotar</label>
                  <input
                    type="number" min={2} max={4} value={rotWeeks}
                    onChange={e => handleRotWeeksChange(Math.min(4, Math.max(2, Number(e.target.value) || 2)))}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-20 text-center focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              {/* Tabs de horarios */}
              <div>
                <div className="flex gap-1 mb-3">
                  {Array.from({ length: rotWeeks }, (_, i) => (
                    <button key={i} type="button"
                      onClick={() => setActiveWeek(i)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                        activeWeek === i
                          ? 'bg-primary-600 text-white'
                          : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      Horario {i + 1}
                    </button>
                  ))}
                </div>

                {weeks[activeWeek] && (
                  <DayTable
                    days={weeks[activeWeek]}
                    isVariable={false}
                    onChange={(idx, patch) => updateWeekDay(activeWeek, idx, patch)}
                  />
                )}
              </div>
            </div>
          )}

          {/* ── Fixed / Variable: tabla de días ── */}
          {type !== 'Rotativo' && (
            <DayTable days={days} isVariable={type === 'Variable'} onChange={updateDay} />
          )}

          {/* Tolerancia — solo Fijo y Rotativo */}
          {type !== 'Variable' && (
            <div className="flex items-center gap-3 border-t pt-4">
              <input type="checkbox" id="tolerance-check" checked={tolerance > 0}
                onChange={e => setTolerance(e.target.checked ? 10 : 0)}
                className="w-4 h-4 text-primary-600 rounded" />
              <label htmlFor="tolerance-check" className="text-sm text-gray-700">
                Considerar retardos solamente si son mayores a
              </label>
              <input type="number" min={0} max={120} value={tolerance}
                onChange={e => setTolerance(Number(e.target.value))}
                disabled={tolerance === 0}
                className="border border-gray-300 rounded px-2 py-1 text-sm w-16 text-center disabled:bg-gray-100" />
              <span className="text-sm text-gray-700">minutos.</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-5 border-t shrink-0">
          <button onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white rounded-lg text-sm font-medium">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Guardando...' : (editing ? 'Actualizar' : 'Crear Horario')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Helpers de tiempo ────────────────────────────────────────────────────────

function calcNetMins(day: any): number {
  if (!day?.isWorkDay || !day.entryTime || !day.exitTime) return 0
  const [eh, em] = day.entryTime.split(':').map(Number)
  const [xh, xm] = day.exitTime.split(':').map(Number)
  let total = (xh * 60 + xm) - (eh * 60 + em)
  if (day.hasLunch && day.lunchStart && day.lunchEnd) {
    const [lsh, lsm] = day.lunchStart.split(':').map(Number)
    const [leh, lem] = day.lunchEnd.split(':').map(Number)
    total -= (leh * 60 + lem) - (lsh * 60 + lsm)
  }
  return Math.max(0, total)
}

function minsLabel(mins: number): string {
  if (mins <= 0) return '—'
  const h = Math.floor(mins / 60), m = mins % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

// ─── ScheduleCard ─────────────────────────────────────────────────────────────

function ScheduleCard({
  s,
  onEdit,
  onDelete,
}: {
  s: Schedule
  onEdit: () => void
  onDelete: () => void
}) {
  const flatDays = s.type === 'Rotativo'
    ? (s.days as any[][])[0] ?? []
    : (s.days as any[])

  const dayBadges = ['D', 'L', 'M', 'Mi', 'J', 'V', 'S'].map((label, i) => {
    const dow = i
    const isActive = flatDays.find((d: any) => d.day === dow)?.isWorkDay ?? false
    return { label, isActive }
  })

  const totalMinsWeekly = (() => {
    if (s.type === 'Fixed') {
      return (s.days as any[])
        .filter((d: any) => d.isWorkDay)
        .reduce((acc: number, d: any) => acc + calcNetMins(d), 0)
    }
    if (s.type === 'Rotativo') {
      return (s.days as any[][])
        .flat()
        .filter((d: any) => d.isWorkDay)
        .reduce((acc: number, d: any) => acc + calcNetMins(d), 0)
    }
    if (s.type === 'Variable') {
      return (s.days as any[])
        .filter((d: any) => d.isWorkDay)
        .reduce((acc: number, d: any) => acc + (d.requiredMinutes ?? 0), 0)
    }
    return null
  })()

  const clockInfo = (() => {
    if (s.type === 'Variable') return null
    if (s.type === 'Rotativo') {
      const nHorarios = s.rotationWeeks ?? (s.days as any[][]).length
      return `${nHorarios} horario${nHorarios !== 1 ? 's' : ''}`
    }
    const mon = (s.days as any[]).find((d: any) => d.day === 1 && d.isWorkDay)
    return mon ? `${mon.entryTime} — ${mon.exitTime}` : '—'
  })()

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">{s.name}</h3>
          <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
            s.type === 'Rotativo' ? 'bg-purple-50 text-purple-700 border-purple-200' :
            s.type === 'Variable' ? 'bg-amber-50 text-amber-700 border-amber-200' :
            'bg-primary-50 text-primary-700 border-primary-200'
          }`}>
            {s.typeLabel}
          </span>
        </div>
        <div className="flex gap-1">
          <button onClick={onEdit}  className="p-1.5 rounded hover:bg-blue-50 text-blue-600" title="Editar">
            <Pencil className="w-4 h-4" />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded hover:bg-red-50 text-red-500" title="Eliminar">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <div className="flex flex-wrap gap-1">
          {dayBadges.map(({ label, isActive }) => (
            <span key={label} className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-medium ${
              isActive ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-400'
            }`}>
              {label}
            </span>
          ))}
          {s.type === 'Rotativo' && (
            <span className="flex items-center text-xs text-purple-600 ml-1">
              <RefreshCw className="w-3 h-3" />
            </span>
          )}
        </div>
        {totalMinsWeekly != null && totalMinsWeekly > 0 && (
          <span className="ml-auto text-xs font-semibold text-gray-700 whitespace-nowrap">
            {minsLabel(totalMinsWeekly)}{s.type !== 'Rotativo' ? '/sem' : ''}
          </span>
        )}
      </div>

      <div className="flex items-center gap-4 text-xs text-gray-500 border-t pt-3">
        {clockInfo && (
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {clockInfo}
          </div>
        )}
        {s.lateToleranceMinutes > 0 && s.type !== 'Variable' && (
          <span>Tol: {s.lateToleranceMinutes} min</span>
        )}
        <div className="ml-auto flex items-center gap-1">
          <Users className="w-3.5 h-3.5" />
          {s.employeeCount} emp.
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function SchedulesPageInner() {
  const [schedules,    setSchedules]    = useState<Schedule[]>([])
  const [loading,      setLoading]      = useState(true)
  const [showModal,    setShowModal]    = useState(false)
  const [editing,      setEditing]      = useState<Schedule | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Schedule | null>(null)
  const [deleteError,  setDeleteError]  = useState<string | null>(null)
  const [reassignTo,   setReassignTo]   = useState('')
  const [deleting,     setDeleting]     = useState(false)

  const load = async () => {
    try { setLoading(true); setSchedules(await scheduleService.getAll()) }
    catch { /* silent */ } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleSave = async (data: CreateScheduleRequest) => {
    try {
      if (editing) {
        await scheduleService.update(editing.id, data)
        toast.success('Horario actualizado correctamente.')
      } else {
        await scheduleService.create(data)
        toast.success('Horario creado correctamente.')
      }
      setShowModal(false)
      setEditing(null)
      await load()
    } catch (err: any) {
      if (!isHandledError(err)) toast.error(err?.response?.data?.message ?? 'Error al guardar.')
      throw err
    }
  }

  const openDelete = (s: Schedule) => {
    setDeleteError(null); setReassignTo(''); setDeleteTarget(s)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    if (deleteTarget.employeeCount > 0 && !reassignTo) {
      setDeleteError('Selecciona el horario al que reasignarás los empleados.'); return
    }
    setDeleting(true); setDeleteError(null)
    try {
      await scheduleService.delete(deleteTarget.id, reassignTo || undefined)
      setDeleteTarget(null)
      await load()
      toast.success('Horario eliminado correctamente.')
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? 'Error al eliminar.'
      setDeleteError(msg); toast.error(msg)
    } finally { setDeleting(false) }
  }

  function runTour() {
    createTour([
      { element: '#tour-sched-header', title: 'Horarios de trabajo',  description: 'Define los horarios de entrada y salida esperados. Asigna un horario a cada empleado para calcular asistencia, retardos y ausencias.' },
      { element: '#tour-sched-new',    title: 'Crear horario',        description: 'Crea horarios Fijos (hora definida), Variables (mínimo de horas) o Rotativos (ciclo de 2 a 4 semanas).' },
      { element: '#tour-sched-cards',  title: 'Tarjetas de horarios', description: 'Edita o elimina horarios existentes. Los rotativos muestran el ícono de rotación.' },
    ]).drive()
  }

  return (
    <div className="space-y-6">
      <div id="tour-sched-header" className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Horarios</h1>
          <p className="text-gray-500 text-sm mt-0.5">{schedules.length} horario{schedules.length !== 1 ? 's' : ''} configurado{schedules.length !== 1 ? 's' : ''}</p>
          <div className="mt-1"><HelpButton onClick={runTour} /></div>
        </div>
        <button id="tour-sched-new"
          onClick={() => { setEditing(null); setShowModal(true) }}
          className="sm:ml-auto flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Nuevo Horario
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
        </div>
      ) : schedules.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 flex flex-col items-center justify-center py-16 text-gray-400">
          <CalendarDays className="w-10 h-10 mb-2 opacity-30" />
          <p className="text-sm">No hay horarios creados. Crea uno para poder registrar empleados.</p>
        </div>
      ) : (
        <div id="tour-sched-cards" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {schedules.map(s => (
            <ScheduleCard key={s.id} s={s}
              onEdit={() => { setEditing(s); setShowModal(true) }}
              onDelete={() => openDelete(s)} />
          ))}
        </div>
      )}

      {showModal && (
        <ScheduleModal editing={editing} onSave={handleSave}
          onClose={() => { setShowModal(false); setEditing(null) }} />
      )}

      {deleteTarget && (() => {
        const isLast      = schedules.length <= 1
        const hasEmp      = deleteTarget.employeeCount > 0
        const others      = schedules.filter(s => s.id !== deleteTarget.id)
        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" style={{ marginTop: 0 }}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">

              {isLast && (
                <>
                  <div className="flex flex-col items-center text-center gap-3 mb-5">
                    <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                      <Trash2 className="w-6 h-6 text-amber-500" />
                    </div>
                    <h3 className="text-lg font-semibold">No se puede eliminar</h3>
                    <p className="text-sm text-gray-500">
                      <strong>{deleteTarget.name}</strong> es el único horario. Crea otro antes de eliminar este.
                    </p>
                  </div>
                  <div className="flex justify-center">
                    <button onClick={() => setDeleteTarget(null)}
                      className="px-5 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium">
                      Entendido
                    </button>
                  </div>
                </>
              )}

              {!isLast && hasEmp && (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                      <Trash2 className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold">Eliminar horario</h3>
                      <p className="text-xs text-gray-500">{deleteTarget.name}</p>
                    </div>
                  </div>
                  <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                    Este horario tiene <strong>{deleteTarget.employeeCount} empleado{deleteTarget.employeeCount !== 1 ? 's' : ''}</strong> asignado{deleteTarget.employeeCount !== 1 ? 's' : ''}.
                    Selecciona el horario al que quieres reasignarlos:
                  </div>
                  <select value={reassignTo} onChange={e => setReassignTo(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <option value="">— Selecciona un horario —</option>
                    {others.map(s => <option key={s.id} value={s.id}>{s.name} ({s.employeeCount} emp.)</option>)}
                  </select>
                  {deleteError && <p className="text-red-600 text-sm mb-3 bg-red-50 rounded-lg px-3 py-2">{deleteError}</p>}
                  <div className="flex gap-3 justify-end">
                    <button onClick={() => { setDeleteTarget(null); setDeleteError(null) }}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
                    <button onClick={handleDelete} disabled={deleting || !reassignTo}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
                      {deleting && <Loader2 className="w-4 h-4 animate-spin" />} Reasignar y eliminar
                    </button>
                  </div>
                </>
              )}

              {!isLast && !hasEmp && (
                <>
                  <div className="flex flex-col items-center text-center gap-3 mb-5">
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                      <Trash2 className="w-6 h-6 text-red-500" />
                    </div>
                    <h3 className="text-lg font-semibold">¿Eliminar horario?</h3>
                    <p className="text-sm text-gray-500">Se eliminará <strong>{deleteTarget.name}</strong>. Esta acción no se puede deshacer.</p>
                  </div>
                  {deleteError && <p className="text-red-600 text-sm mb-3 bg-red-50 rounded-lg px-3 py-2 text-center">{deleteError}</p>}
                  <div className="flex gap-3 justify-center">
                    <button onClick={() => { setDeleteTarget(null); setDeleteError(null) }}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
                    <button onClick={handleDelete} disabled={deleting}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
                      {deleting && <Loader2 className="w-4 h-4 animate-spin" />} Eliminar
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}

export default function SchedulesPage() {
  return <PlanGate capability="schedules"><SchedulesPageInner /></PlanGate>
}
