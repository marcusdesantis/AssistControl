import { useEffect, useState, useCallback } from 'react'
import PlanGate from '@/components/PlanGate'
import { toast } from 'sonner'
import { Plus, Trash2, X, Loader2, MessageSquare, Users, Send, Loader } from 'lucide-react'
import { messageService } from './messageService'
import { employeeService } from '../employees/employeeService'
import Pagination from '@/components/Pagination'
import type { EmployeeMessage } from '@/types/message'
import type { Employee } from '@/types/employee'
import type { PagedResult } from '@/types/pagination'
import { useAuthStore } from '@/store/authStore'
import { countryToLocale } from '@/utils/locale'
import { createTour } from '@/utils/tour'
import HelpButton from '@/components/HelpButton'

const PAGE_SIZE_OPTIONS = [10, 15, 20, 50]

// ─── New Message Modal ────────────────────────────────────────────────────────
function NewMessageModal({
  onSave, onClose,
}: {
  onSave: (payload: { employeeIds?: string[]; forAll: boolean; subject: string; body: string; allowDelete: boolean }) => Promise<void>
  onClose: () => void
}) {
  const [allEmployees, setAllEmployees] = useState<Employee[]>([])
  const [loadingEmps,  setLoadingEmps]  = useState(true)
  const [forAll,       setForAll]       = useState(false)
  const [selected,     setSelected]     = useState<Set<string>>(new Set())
  const [subject,      setSubject]      = useState('')
  const [body,         setBody]         = useState('')
  const [allowDelete,  setAllowDelete]  = useState(true)
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [empSearch,    setEmpSearch]    = useState('')

  useEffect(() => {
    employeeService.getAll()
      .then(emps => setAllEmployees(emps.filter(e => e.status === 'Active')))
      .finally(() => setLoadingEmps(false))
  }, [])

  const toggleEmployee = (id: string) => {
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  }

  const filteredEmps = allEmployees.filter(e => {
    const q = empSearch.toLowerCase()
    return !q || e.fullName.toLowerCase().includes(q) || e.employeeCode.toLowerCase().includes(q)
  })

  const handleSave = async () => {
    if (!subject.trim()) { setError('El asunto es requerido.'); return }
    if (!body.trim())    { setError('El mensaje no puede estar vacío.'); return }
    if (!forAll && selected.size === 0) { setError('Selecciona al menos un empleado.'); return }
    setSaving(true); setError(null)
    try {
      await onSave({ employeeIds: forAll ? undefined : Array.from(selected), forAll, subject, body, allowDelete })
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Error al enviar el mensaje.')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" style={{marginTop:0}}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b shrink-0">
          <h2 className="text-lg font-semibold">Nuevo mensaje personal</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto flex-1 min-h-0">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Crear mensaje para:</label>
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="radio" checked={!forAll} onChange={() => setForAll(false)} className="w-4 h-4 text-primary-600" />
                Solo los empleados seleccionados
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="radio" checked={forAll} onChange={() => setForAll(true)} className="w-4 h-4 text-primary-600" />
                Todos los empleados activos
              </label>
            </div>
          </div>
          {!forAll && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-3 py-2 border-b">
                <input value={empSearch} onChange={e => setEmpSearch(e.target.value)}
                  placeholder="Buscar empleado..."
                  className="w-full text-sm focus:outline-none bg-transparent" />
              </div>
              {loadingEmps ? (
                <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-primary-500" /></div>
              ) : (
                <div className="max-h-40 overflow-y-auto divide-y divide-gray-100">
                  {filteredEmps.map(e => (
                    <label key={e.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50">
                      <input type="checkbox" checked={selected.has(e.id)} onChange={() => toggleEmployee(e.id)} className="w-4 h-4 text-primary-600 rounded" />
                      <div>
                        <p className="text-sm font-medium text-gray-800">{e.fullName}</p>
                        <p className="text-xs text-gray-400">{e.departmentName} · {e.employeeCode}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
              {selected.size > 0 && (
                <div className="px-3 py-1.5 bg-primary-50 border-t text-xs text-primary-700 font-medium">
                  {selected.size} empleado(s) seleccionado(s)
                </div>
              )}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Asunto *</label>
            <input value={subject} onChange={e => setSubject(e.target.value)} className="input-field" placeholder="Ej: Reunión obligatoria..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mensaje *</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              placeholder="Escribe el mensaje aquí..." />
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
            <input type="checkbox" checked={allowDelete} onChange={e => setAllowDelete(e.target.checked)} className="w-4 h-4 text-primary-600 rounded" />
            Permitir al empleado eliminar el mensaje cuando lo haya leído
          </label>
        </div>
        <div className="flex justify-end gap-3 p-5 border-t shrink-0">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white rounded-lg text-sm font-medium">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {saving ? 'Enviando...' : 'Enviar mensaje'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
function MessagesPageInner() {
  const _u        = useAuthStore(s => s.user)
  const _timeZone = _u?.timeZone ?? 'America/Guayaquil'
  const _locale   = countryToLocale(_u?.country ?? 'EC')
  // Panel izquierdo — empleados
  const [empResult,    setEmpResult]    = useState<PagedResult<Employee> | null>(null)
  const [empPage,      setEmpPage]      = useState(1)
  const [empPageSize,  setEmpPageSize]  = useState(10)
  const [empSearch,    setEmpSearch]    = useState('')
  const [empSearchIn,  setEmpSearchIn]  = useState('')
  const [loadingEmps,  setLoadingEmps]  = useState(true)

  // Panel derecho — mensajes del empleado seleccionado
  const [selectedEmp,  setSelectedEmp]  = useState<Employee | null>(null)
  const [msgResult,    setMsgResult]    = useState<PagedResult<EmployeeMessage> | null>(null)
  const [msgPage,      setMsgPage]      = useState(1)
  const [msgPageSize,  setMsgPageSize]  = useState(10)
  const [loadingMsgs,  setLoadingMsgs]  = useState(false)

  const [showModal,       setShowModal]       = useState(false)
  const [deleteTarget,    setDeleteTarget]    = useState<EmployeeMessage | null>(null)
  const [deleting,        setDeleting]        = useState(false)
  const [togglingId,      setTogglingId]      = useState<string | null>(null)

  // Debounce búsqueda empleados
  useEffect(() => {
    const t = setTimeout(() => { setEmpSearch(empSearchIn); setEmpPage(1) }, 300)
    return () => clearTimeout(t)
  }, [empSearchIn])

  const loadEmployees = useCallback(async (p = empPage) => {
    setLoadingEmps(true)
    try {
      const data = await employeeService.getPaged({ page: p, pageSize: empPageSize, search: empSearch, status: 'Active' })
      setEmpResult(data)
    } finally { setLoadingEmps(false) }
  }, [empPage, empPageSize, empSearch])

  useEffect(() => { loadEmployees() }, [loadEmployees])

  const loadMessages = useCallback(async (emp: Employee, p = 1, ps = msgPageSize) => {
    setSelectedEmp(emp)
    setMsgPage(p)
    setLoadingMsgs(true)
    try {
      const data = await messageService.getByEmployee(emp.id, p, ps)
      setMsgResult(data)
    } finally { setLoadingMsgs(false) }
  }, [msgPageSize])

  const handleSend = async (payload: { employeeIds?: string[]; forAll: boolean; subject: string; body: string; allowDelete: boolean }) => {
    await messageService.create(payload)
    setShowModal(false)
    if (selectedEmp) loadMessages(selectedEmp, msgPage, msgPageSize)
    toast.success('Mensaje enviado correctamente.')
  }

  const handleToggleAllowDelete = async (msg: EmployeeMessage) => {
    setTogglingId(msg.id)
    try {
      await messageService.updateAllowDelete(msg.id, !msg.allowDelete)
      if (selectedEmp) loadMessages(selectedEmp, msgPage, msgPageSize)
    } catch {
      toast.error('No se pudo actualizar el mensaje.')
    } finally { setTogglingId(null) }
  }

  const handleDelete = async (msg: EmployeeMessage) => {
    setDeleting(true)
    try {
      await messageService.delete(msg.id)
      setDeleteTarget(null)
      if (selectedEmp) loadMessages(selectedEmp, msgPage, msgPageSize)
      toast.success('Mensaje eliminado.')
    } catch {
      toast.error('No se pudo eliminar el mensaje.')
    } finally { setDeleting(false) }
  }

  const formatDate = (iso: string) => new Date(iso).toLocaleString(_locale, {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: _timeZone,
  })

  const employees  = empResult?.items ?? []
  const messages   = msgResult?.items ?? []

  function runTour() {
    createTour([
      { element: '#tour-msg-header',   title: 'Mensajes personales',   description: 'Envía avisos o notificaciones internas a uno o varios empleados. Los mensajes aparecen en la app móvil del empleado y en el checador web.' },
      { element: '#tour-msg-new',      title: 'Nuevo mensaje',         description: 'Crea un nuevo mensaje: elige si es para un empleado específico o para todos, escribe el asunto y el contenido.' },
      { element: '#tour-msg-employees',title: 'Lista de empleados',     description: 'Selecciona un empleado en el panel izquierdo para ver sus mensajes enviados en el panel derecho.' },
      { element: '#tour-msg-messages', title: 'Mensajes del empleado',  description: 'Aquí se muestran todos los mensajes enviados al empleado seleccionado, con su estado de lectura y la opción de eliminarlos.' },
    ]).drive()
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div id="tour-msg-header" className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mensajes personales</h1>
          <p className="text-gray-500 text-sm mt-0.5">Envía avisos individuales a empleados</p>
          <div className="mt-1"><HelpButton onClick={runTour} /></div>
        </div>
        <button id="tour-msg-new" onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Nuevo mensaje
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[500px]">

        {/* Panel izquierdo: lista de empleados */}
        <div id="tour-msg-employees" className="bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden">
          <div className="p-3 border-b bg-primary-700 text-white shrink-0">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="text-sm font-semibold">
                Empleados {empResult ? `(${empResult.totalCount})` : ''}
              </span>
            </div>
          </div>
          <div className="p-3 border-b shrink-0">
            <input value={empSearchIn} onChange={e => setEmpSearchIn(e.target.value)}
              placeholder="Buscar empleado..."
              className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            {loadingEmps ? (
              <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-primary-500" /></div>
            ) : employees.length === 0 ? (
              <p className="text-center text-gray-400 py-8 text-sm">Sin resultados</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {employees.map((emp, idx) => (
                  <button key={emp.id} onClick={() => loadMessages(emp)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${selectedEmp?.id === emp.id ? 'bg-primary-50 border-l-2 border-primary-600' : ''}`}>
                    <div className="flex items-center gap-3">
                      <span className="w-6 text-xs text-gray-400 shrink-0">
                        {(empPage - 1) * empPageSize + idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{emp.fullName}</p>
                        <p className="text-xs text-gray-400 truncate">{emp.departmentName} · {emp.positionName}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          {empResult && (
            <Pagination
              page={empPage} totalPages={empResult.totalPages}
              totalCount={empResult.totalCount} pageSize={empPageSize}
              onPageChange={p => { setEmpPage(p); loadEmployees(p) }}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageSizeChange={n => { setEmpPageSize(n); setEmpPage(1) }}
            />
          )}
        </div>

        {/* Panel derecho: mensajes del empleado seleccionado */}
        <div id="tour-msg-messages" className="bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden">
          <div className="p-3 border-b bg-primary-700 text-white shrink-0">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              <span className="text-sm font-semibold truncate">
                {selectedEmp
                  ? `${selectedEmp.fullName}${msgResult ? ` (${msgResult.totalCount})` : ''}`
                  : 'Selecciona un empleado'}
              </span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            {!selectedEmp ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 py-12">
                <MessageSquare className="w-10 h-10 mb-2 opacity-20" />
                <p className="text-sm">Selecciona un empleado para ver sus mensajes</p>
              </div>
            ) : loadingMsgs ? (
              <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-primary-500" /></div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 py-12">
                <MessageSquare className="w-10 h-10 mb-2 opacity-20" />
                <p className="text-sm">No hay mensajes para este empleado</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                  <tr>
                    {['Fecha', 'Remitente', 'Asunto', 'Estado', 'Emp. puede borrar', ''].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {messages.map(msg => (
                    <tr key={msg.id} className={`hover:bg-gray-50 transition-colors ${!msg.isRead ? 'font-medium' : ''}`}>
                      <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">{formatDate(msg.createdAt)}</td>
                      <td className="px-4 py-2.5 text-gray-700">{msg.senderName}</td>
                      <td className="px-4 py-2.5 text-gray-900 max-w-[180px]">
                        <p className="truncate">{msg.subject}</p>
                        {msg.body && <p className="text-xs text-gray-400 truncate font-normal">{msg.body}</p>}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${msg.isRead ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-700'}`}>
                          {msg.isRead ? 'Leído' : 'No leído'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {togglingId === msg.id
                          ? <Loader className="w-4 h-4 animate-spin text-primary-400 mx-auto" />
                          : (
                            <input
                              type="checkbox"
                              checked={msg.allowDelete}
                              onChange={() => handleToggleAllowDelete(msg)}
                              className="w-4 h-4 text-primary-600 rounded cursor-pointer"
                              title={msg.allowDelete ? 'El empleado puede borrar este mensaje' : 'El empleado no puede borrar este mensaje'}
                            />
                          )
                        }
                      </td>
                      <td className="px-4 py-2.5">
                        <button onClick={() => setDeleteTarget(msg)} className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {msgResult && selectedEmp && (
            <Pagination
              page={msgPage} totalPages={msgResult.totalPages}
              totalCount={msgResult.totalCount} pageSize={msgPageSize}
              onPageChange={p => loadMessages(selectedEmp, p)}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageSizeChange={n => { setMsgPageSize(n); loadMessages(selectedEmp, 1, n) }}
            />
          )}
        </div>
      </div>

      {showModal && <NewMessageModal onSave={handleSend} onClose={() => setShowModal(false)} />}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" style={{marginTop:0}}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <Trash2 className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">¿Eliminar mensaje?</h3>
            <p className="text-gray-500 text-sm mb-6">Se eliminará "<strong>{deleteTarget.subject}</strong>".</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
              <button onClick={() => handleDelete(deleteTarget)} disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-lg text-sm font-medium">
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function MessagesPage() {
  return <PlanGate capability="messages"><MessagesPageInner /></PlanGate>
}
