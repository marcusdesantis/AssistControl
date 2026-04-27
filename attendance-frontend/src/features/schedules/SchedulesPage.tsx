import { useEffect, useState } from 'react'
import PlanGate from '@/components/PlanGate'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, X, Clock, Loader2, Users, CalendarDays, Copy } from 'lucide-react'
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
  { value: 'Fixed',    label: 'Fijo',      desc: 'El empleado debe cumplir con un horario de entrada y salida.' },
  // { value: 'Variable', label: 'Variable',  desc: 'El empleado debe cumplir con un número de horas diarias.'    },
  // { value: 'Rotating', label: 'Rotativo',  desc: 'El horario cambia automáticamente cada semana.'              },
]

const DEFAULT_DAY = (day: number): ScheduleDayInput => ({
  day,
  isWorkDay:  day >= 1 && day <= 5, // Mon-Fri active by default
  entryTime:  '08:00',
  exitTime:   '17:00',
  hasLunch:   false,
  lunchStart: '13:00',
  lunchEnd:   '14:00',
})

const DEFAULT_DAYS: ScheduleDayInput[] = DAYS.map(d => DEFAULT_DAY(d.value))

// ─── Schedule Form Modal ──────────────────────────────────────────────────────
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
  const [reqHours,  setReqHours]  = useState(editing?.requiredHoursPerDay ?? 8)

  const [days, setDays] = useState<ScheduleDayInput[]>(() =>
    editing
      ? DAYS.map(d => {
          const found = editing.days.find(x => x.day === d.value)
          return found
            ? {
                day: d.value,
                isWorkDay: found.isWorkDay,
                entryTime:  found.entryTime  ?? '08:00',
                exitTime:   found.exitTime   ?? '17:00',
                hasLunch:   found.hasLunch,
                lunchStart: found.lunchStart ?? '13:00',
                lunchEnd:   found.lunchEnd   ?? '14:00',
              }
            : DEFAULT_DAY(d.value)
        })
      : DEFAULT_DAYS
  )

  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  const updateDay = (idx: number, patch: Partial<ScheduleDayInput>) =>
    setDays(prev => prev.map((d, i) => i === idx ? { ...d, ...patch } : d))

  // ✅ Copiar lunes a días activos
  const copyFromFirstDay = () => {
    if (!days.length) return
    const firstDay = days[0]
    if (!firstDay.isWorkDay) return

    setDays(prev =>
      prev.map((d, idx) => {
        if (idx === 0) return d
        if (!d.isWorkDay) return d

        return {
          ...d,
          entryTime: firstDay.entryTime,
          exitTime: firstDay.exitTime,
          hasLunch: firstDay.hasLunch,
          lunchStart: firstDay.lunchStart,
          lunchEnd: firstDay.lunchEnd,
        }
      })
    )
  }

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('El nombre es requerido.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      await onSave({
        name: name.trim(),
        type,
        lateToleranceMinutes: tolerance,
        requiredHoursPerDay: type === 'Variable' ? reqHours : undefined,
        days: days.map(d => ({
          ...d,
          entryTime:  d.isWorkDay ? d.entryTime  : '00:00',
          exitTime:   d.isWorkDay ? d.exitTime   : '00:00',
          lunchStart: d.isWorkDay && d.hasLunch ? d.lunchStart : undefined,
          lunchEnd:   d.isWorkDay && d.hasLunch ? d.lunchEnd   : undefined,
        })),
      })
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Error al guardar el horario.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" style={{marginTop:0}}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b shrink-0">
          <h2 className="text-lg font-semibold">
            {editing ? 'Editar Horario' : 'Nuevo Horario'}
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto flex-1 min-h-0">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
              {error}
            </div>
          )}

          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del horario *
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="input-field"
              placeholder="Ej: Turno General, Turno Tarde..."
            />
          </div>

          {/* Tipo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de horario
            </label>

            <div className="space-y-2">
              {TYPE_OPTIONS.map(opt => (
                <label key={opt.value} className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    checked={type === opt.value}
                    onChange={() => setType(opt.value)}
                    className="mt-0.5 w-4 h-4 text-primary-600"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-800">
                      {opt.label}:
                    </span>{' '}
                    <span className="text-sm text-gray-500">{opt.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Horas requeridas */}
          {type === 'Variable' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Horas diarias requeridas
              </label>
              <input
                type="number"
                min={1}
                max={24}
                step={0.5}
                value={reqHours}
                onChange={e => setReqHours(Number(e.target.value))}
                className="input-field w-32"
              />
            </div>
          )}

          {/* Tabla de días */}
          {type !== 'Variable' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Horario por día
                </label>

                {/* ✅ BOTÓN ICONO */}
                <button
                  type="button"
                  onClick={copyFromFirstDay}
                  disabled={!days[0].isWorkDay}
                  title="Copiar configuración del lunes a los días activos"
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <Copy className="w-4 h-4 text-gray-600" />
                </button>
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs text-gray-500 font-semibold w-28">Día</th>
                      <th className="px-3 py-2 text-center text-xs text-gray-500 font-semibold w-10">Activo</th>
                      <th className="px-3 py-2">Entrada</th>
                      <th className="px-3 py-2">Salida</th>
                      <th className="px-3 py-2 text-center">Comida</th>
                      <th className="px-3 py-2">Sal. Comida</th>
                      <th className="px-3 py-2">Reg. Comida</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {DAYS.map((dayDef, idx) => {
                      const d = days[idx]

                      return (
                        <tr key={dayDef.value} className={!d.isWorkDay ? 'opacity-60 bg-gray-50' : ''}>
                          <td className="px-3 py-2 font-medium">{dayDef.label}</td>

                          <td className="text-center">
                            <input
                              type="checkbox"
                              checked={d.isWorkDay}
                              onChange={e => updateDay(idx, { isWorkDay: e.target.checked })}
                              className="w-4 h-4"
                            />
                          </td>

                          <td>
                            <input
                              type="time"
                              value={d.entryTime}
                              disabled={!d.isWorkDay}
                              onChange={e => updateDay(idx, { entryTime: e.target.value })}
                            />
                          </td>

                          <td>
                            <input
                              type="time"
                              value={d.exitTime}
                              disabled={!d.isWorkDay}
                              onChange={e => updateDay(idx, { exitTime: e.target.value })}
                            />
                          </td>

                          <td className="text-center">
                            <input
                              type="checkbox"
                              checked={d.hasLunch}
                              disabled={!d.isWorkDay}
                              onChange={e => updateDay(idx, { hasLunch: e.target.checked })}
                            />
                          </td>

                          <td>
                            <input
                              type="time"
                              value={d.lunchStart ?? '13:00'}
                              disabled={!d.isWorkDay || !d.hasLunch}
                              onChange={e => updateDay(idx, { lunchStart: e.target.value })}
                            />
                          </td>

                          <td>
                            <input
                              type="time"
                              value={d.lunchEnd ?? '14:00'}
                              disabled={!d.isWorkDay || !d.hasLunch}
                              onChange={e => updateDay(idx, { lunchEnd: e.target.value })}
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ✅ TOLERANCIA (recuperado) */}
          <div className="flex items-center gap-3 border-t pt-4">
            <input
              type="checkbox"
              id="tolerance-check"
              checked={tolerance > 0}
              onChange={e => setTolerance(e.target.checked ? 10 : 0)}
              className="w-4 h-4 text-primary-600 rounded"
            />

            <label htmlFor="tolerance-check" className="text-sm text-gray-700">
              Considerar retardos solamente si son mayores a
            </label>

            <input
              type="number"
              min={0}
              max={120}
              value={tolerance}
              onChange={e => setTolerance(Number(e.target.value))}
              disabled={tolerance === 0}
              className="border border-gray-300 rounded px-2 py-1 text-sm w-16 text-center disabled:bg-gray-100"
            />

            <span className="text-sm text-gray-700">minutos.</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-5 border-t shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
          >
            Cancelar
          </button>

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white rounded-lg text-sm font-medium"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Guardando...' : (editing ? 'Actualizar' : 'Crear Horario')}
          </button>
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
    try {
      setLoading(true)
      setSchedules(await scheduleService.getAll())
    } catch { /* silent */ } finally { setLoading(false) }
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
      if (!isHandledError(err)) toast.error(err?.response?.data?.message ?? 'Error al guardar el horario.')
      throw err
    }
  }

  const openDelete = (s: Schedule) => {
    setDeleteError(null)
    setReassignTo('')
    setDeleteTarget(s)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    const needsReassign = deleteTarget.employeeCount > 0
    if (needsReassign && !reassignTo) {
      setDeleteError('Selecciona el horario al que reasignarás los empleados.')
      return
    }
    setDeleting(true)
    setDeleteError(null)
    try {
      await scheduleService.delete(deleteTarget.id, reassignTo || undefined)
      setDeleteTarget(null)
      await load()
      toast.success('Horario eliminado correctamente.')
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? 'Error al eliminar el horario.'
      setDeleteError(msg)
      toast.error(msg)
    } finally {
      setDeleting(false)
    }
  }

  function runTour() {
    createTour([
      { element: '#tour-sched-header', title: 'Horarios de trabajo',   description: 'Los horarios definen las horas de entrada y salida esperadas por día. Debes asignar un horario a cada empleado para que el sistema pueda calcular si llegó tarde, a tiempo o estuvo ausente.' },
      { element: '#tour-sched-new',    title: 'Crear horario',         description: 'Crea un nuevo horario con el botón "+ Nuevo Horario". Puedes definir horarios fijos (misma hora todos los días) o por turno (horas distintas por día de la semana).' },
      { element: '#tour-sched-cards',  title: 'Tarjetas de horarios',  description: 'Cada tarjeta muestra el nombre del horario, su tipo y los días/horas configurados. Puedes editar, duplicar o eliminar cada horario con los iconos de la tarjeta.' },
    ]).drive()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div id="tour-sched-header" className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Horarios</h1>
          <p className="text-gray-500 text-sm mt-0.5">{schedules.length} horarios configurados</p>
          <div className="mt-1"><HelpButton onClick={runTour} /></div>
        </div>
        <button
          id="tour-sched-new"
          onClick={() => { setEditing(null); setShowModal(true) }}
          className="sm:ml-auto flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Nuevo Horario
        </button>
      </div>

      {/* Cards */}
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
            <div key={s.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{s.name}</h3>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary-50 text-primary-700 border border-primary-200">
                    {s.typeLabel}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setEditing(s); setShowModal(true) }}
                    className="p-1.5 rounded hover:bg-blue-50 text-blue-600" title="Editar">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => openDelete(s)}
                    className="p-1.5 rounded hover:bg-red-50 text-red-500" title="Eliminar">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Días activos */}
              <div className="flex flex-wrap gap-1">
                {['D', 'L', 'M', 'Mi', 'J', 'V', 'S'].map((label, i) => {
                  // Map display index to DayOfWeek: 0=D(0),1=L(1),...,6=S(6)
                  const dow = i === 0 ? 0 : i
                  const isActive = s.days.find(d => d.day === dow)?.isWorkDay ?? false
                  return (
                    <span key={label} className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-medium
                      ${isActive ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                      {label}
                    </span>
                  )
                })}
              </div>

              {/* Info rápida */}
              <div className="flex items-center gap-4 text-xs text-gray-500 border-t pt-3">
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {s.type === 'Variable'
                    ? `${s.requiredHoursPerDay}h/día`
                    : (() => {
                        const mon = s.days.find(d => d.day === 1 && d.isWorkDay)
                        return mon ? `${mon.entryTime} — ${mon.exitTime}` : '—'
                      })()
                  }
                </div>
                {s.lateToleranceMinutes > 0 && (
                  <span>Tolerancia: {s.lateToleranceMinutes} min</span>
                )}
                <div className="ml-auto flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {s.employeeCount} emp.
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal crear/editar */}
      {showModal && (
        <ScheduleModal
          editing={editing}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditing(null) }}
        />
      )}

      {/* Modal eliminar */}
      {deleteTarget && (() => {
        const isLastSchedule  = schedules.length <= 1
        const hasEmployees    = deleteTarget.employeeCount > 0
        const otherSchedules  = schedules.filter(s => s.id !== deleteTarget.id)

        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" style={{marginTop:0}}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">

              {/* ── Caso 1: único horario ─────────────────────────── */}
              {isLastSchedule && (
                <>
                  <div className="flex flex-col items-center text-center gap-3 mb-5">
                    <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                      <Trash2 className="w-6 h-6 text-amber-500" />
                    </div>
                    <h3 className="text-lg font-semibold">No se puede eliminar</h3>
                    <p className="text-sm text-gray-500">
                      <strong>{deleteTarget.name}</strong> es el único horario configurado.
                      Crea otro horario antes de eliminar este.
                    </p>
                  </div>
                  <div className="flex justify-center">
                    <button
                      onClick={() => setDeleteTarget(null)}
                      className="px-5 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
                    >
                      Entendido
                    </button>
                  </div>
                </>
              )}

              {/* ── Caso 2: tiene empleados → reasignar ──────────── */}
              {!isLastSchedule && hasEmployees && (
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

                  <div className="mb-4">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Reasignar empleados a
                    </label>
                    <select
                      value={reassignTo}
                      onChange={e => setReassignTo(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">— Selecciona un horario —</option>
                      {otherSchedules.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.employeeCount} emp.)
                        </option>
                      ))}
                    </select>
                  </div>

                  {deleteError && (
                    <p className="text-red-600 text-sm mb-3 bg-red-50 rounded-lg px-3 py-2">{deleteError}</p>
                  )}

                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => { setDeleteTarget(null); setDeleteError(null) }}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={deleting || !reassignTo}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
                    >
                      {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                      Reasignar y eliminar
                    </button>
                  </div>
                </>
              )}

              {/* ── Caso 3: sin empleados → confirmar simple ─────── */}
              {!isLastSchedule && !hasEmployees && (
                <>
                  <div className="flex flex-col items-center text-center gap-3 mb-5">
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                      <Trash2 className="w-6 h-6 text-red-500" />
                    </div>
                    <h3 className="text-lg font-semibold">¿Eliminar horario?</h3>
                    <p className="text-sm text-gray-500">
                      Se eliminará <strong>{deleteTarget.name}</strong>. Esta acción no se puede deshacer.
                    </p>
                  </div>

                  {deleteError && (
                    <p className="text-red-600 text-sm mb-3 bg-red-50 rounded-lg px-3 py-2 text-center">{deleteError}</p>
                  )}

                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => { setDeleteTarget(null); setDeleteError(null) }}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
                    >
                      {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                      Eliminar
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
