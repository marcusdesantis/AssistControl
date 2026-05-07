import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, X, Loader2, CalendarOff, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react'
import { holidayService } from './holidayService'
import type { Holiday } from './holidayService'
import { isHandledError } from '@/services/api'
import PlanGate from '@/components/PlanGate'
import { createTour } from '@/utils/tour'
import HelpButton from '@/components/HelpButton'

const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DAYS_ES   = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']

function dayName(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  return DAYS_ES[d.getDay()]
}

function monthLabel(dateStr: string) {
  return MONTHS_ES[parseInt(dateStr.substring(5, 7), 10) - 1]
}

// Group holidays by month label
function groupByMonth(list: Holiday[]): { month: string; items: Holiday[] }[] {
  const map = new Map<string, Holiday[]>()
  for (const h of list) {
    const m = monthLabel(h.date)
    if (!map.has(m)) map.set(m, [])
    map.get(m)!.push(h)
  }
  return Array.from(map.entries()).map(([month, items]) => ({ month, items }))
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function HolidayModal({
  editing,
  year,
  onSave,
  onClose,
}: {
  editing: Holiday | null
  year:    number
  onSave:  (data: { date: string; name: string; description: string | null }) => Promise<void>
  onClose: () => void
}) {
  const [date, setDate]   = useState(editing?.date ?? `${year}-01-01`)
  const [name, setName]   = useState(editing?.name ?? '')
  const [desc, setDesc]   = useState(editing?.description ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!date) { setError('La fecha es requerida.'); return }
    if (!name.trim()) { setError('El nombre es requerido.'); return }
    setSaving(true); setError(null)
    try {
      await onSave({ date, name: name.trim(), description: desc.trim() || null })
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Error al guardar.')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" style={{ marginTop: 0 }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-base font-semibold">{editing ? 'Editar día inhábil' : 'Nuevo día inhábil'}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="input-field" placeholder="Ej: Año Nuevo, Día del Trabajo..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input value={desc} onChange={e => setDesc(e.target.value)}
              className="input-field" placeholder="Ej: Feriado nacional" />
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
            Este día será excluido automáticamente de los reportes de ausencias para todos los empleados.
          </div>
        </div>

        <div className="flex justify-end gap-3 p-5 border-t">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white rounded-lg text-sm font-medium">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Guardando...' : (editing ? 'Actualizar' : 'Guardar')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function HolidaysPageInner() {
  const currentYear = new Date().getFullYear()
  const [year,      setYear]      = useState(currentYear)
  const [holidays,  setHolidays]  = useState<Holiday[]>([])
  const [loading,   setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing,   setEditing]   = useState<Holiday | null>(null)
  const [deleting,  setDeleting]  = useState<Holiday | null>(null)
  const [generating, setGenerating] = useState(false)

  const load = async () => {
    try { setLoading(true); setHolidays(await holidayService.getAll(year)) }
    catch { /* silent */ } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [year])

  const handleSave = async (data: { date: string; name: string; description: string | null }) => {
    if (editing) {
      await holidayService.update(editing.id, data)
      toast.success('Día inhábil actualizado.')
    } else {
      await holidayService.create(data)
      toast.success('Día inhábil creado.')
    }
    setShowModal(false); setEditing(null); await load()
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await holidayService.delete(deleting.id)
      toast.success('Día inhábil eliminado.')
      setDeleting(null); await load()
    } catch (e: any) {
      if (!isHandledError(e)) toast.error(e?.response?.data?.message ?? 'Error al eliminar.')
    }
  }

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const result = await holidayService.generate(year)
      const parts = []
      if (result.added    > 0) parts.push(`${result.added} agregado${result.added !== 1 ? 's' : ''}`)
      if (result.replaced > 0) parts.push(`${result.replaced} reemplazado${result.replaced !== 1 ? 's' : ''}`)
      if (parts.length > 0) {
        toast.success(`Feriados de ${year} actualizados: ${parts.join(', ')}.`)
      } else {
        toast.info(`Los feriados de ${year} ya estaban al día.`)
      }
      await load()
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Error al obtener feriados.')
    } finally { setGenerating(false) }
  }

  const groups = groupByMonth(holidays)

  function runTour() {
    createTour([
      { element: '#tour-hol-header',   title: 'Días Inhábiles',           description: 'Aquí defines los días en que todos los empleados descansan: feriados nacionales, regionales o propios de tu empresa. Estos días se excluyen automáticamente de los reportes de ausencias.' },
      { element: '#tour-hol-generate', title: 'Generar feriados del país', description: 'Importa automáticamente los feriados oficiales del año seleccionado según el país configurado en tu empresa. Puedes editarlos o eliminarlos después.' },
      { element: '#tour-hol-new',      title: 'Nuevo día inhábil',         description: 'Agrega manualmente un día inhábil propio de tu empresa, como aniversarios, cierre de año o días no laborables específicos.' },
      { element: '#tour-hol-year',     title: 'Selector de año',           description: 'Navega entre años para ver o gestionar los días inhábiles de cada período. Los días se deben registrar año con año.' },
    ]).drive()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div id="tour-hol-header" className="flex flex-col sm:flex-row sm:items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Días Inhábiles</h1>
          <p className="text-gray-500 text-sm mt-0.5">Fechas en que todos los empleados descansan (feriados oficiales y propios).</p>
          <div className="mt-1"><HelpButton onClick={runTour} /></div>
        </div>
        <div className="sm:ml-auto flex gap-2 flex-wrap">
          <button id="tour-hol-generate" onClick={handleGenerate} disabled={generating}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 transition">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-amber-500" />}
            Generar feriados del país
          </button>
          <button id="tour-hol-new" onClick={() => { setEditing(null); setShowModal(true) }}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
            <Plus className="w-4 h-4" /> Nuevo día inhábil
          </button>
        </div>
      </div>

      {/* Year selector */}
      <div id="tour-hol-year" className="flex items-center justify-center gap-3">
        <button onClick={() => setYear(y => y - 1)}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition">
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        </button>
        <span className="text-lg font-semibold text-gray-800 w-16 text-center">{year}</span>
        <button onClick={() => setYear(y => y + 1)}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition">
          <ChevronRight className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
        </div>
      ) : holidays.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
          <CalendarOff className="w-10 h-10 opacity-30" />
          <p className="text-sm">No hay días inhábiles registrados para {year}.</p>
          <button onClick={handleGenerate} disabled={generating}
            className="flex items-center gap-2 text-xs text-primary-600 hover:underline">
            <Sparkles className="w-3.5 h-3.5" />
            Generar feriados oficiales del país
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {groups.map(({ month, items }, gi) => (
            <div key={month}>
              <div className={`px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide ${gi > 0 ? 'border-t border-gray-200' : ''}`}>
                {month}
              </div>
              <div className="divide-y divide-gray-100">
                {items.map(h => (
                  <div key={h.id} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50">
                    <div className="w-12 h-12 rounded-xl bg-primary-50 border border-primary-100 flex flex-col items-center justify-center shrink-0">
                      <span className="text-lg font-bold text-primary-700 leading-none">
                        {parseInt(h.date.substring(8, 10), 10)}
                      </span>
                      <span className="text-xs text-primary-400">{monthLabel(h.date).substring(0, 3)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{h.name}</p>
                      <p className="text-xs text-gray-400">
                        {dayName(h.date)}
                        {h.description ? ` · ${h.description}` : ''}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => { setEditing(h); setShowModal(true) }}
                        className="p-1.5 rounded hover:bg-blue-50 text-blue-500" title="Editar">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleting(h)}
                        className="p-1.5 rounded hover:bg-red-50 text-red-400" title="Eliminar">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-center text-xs text-gray-400">
        {holidays.length} día{holidays.length !== 1 ? 's' : ''} inhábil{holidays.length !== 1 ? 'es' : ''} en {year}
      </p>

      {/* Modal crear/editar */}
      {showModal && (
        <HolidayModal editing={editing} year={year} onSave={handleSave}
          onClose={() => { setShowModal(false); setEditing(null) }} />
      )}

      {/* Modal confirmar eliminar */}
      {deleting && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" style={{ marginTop: 0 }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">¿Eliminar día inhábil?</h3>
              <p className="text-sm text-gray-500 mt-1">
                Se eliminará <strong>{deleting.name}</strong> ({deleting.date}). Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setDeleting(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={handleDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function HolidaysPage() {
  return <PlanGate capability="holidays"><HolidaysPageInner /></PlanGate>
}
