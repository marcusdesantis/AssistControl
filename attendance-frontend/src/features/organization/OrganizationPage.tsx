import { useEffect, useState, useCallback, useRef } from 'react'
import PlanGate from '@/components/PlanGate'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, X, Loader2, Building, Briefcase, Users, Search } from 'lucide-react'
import { isHandledError } from '@/services/api'
import { departmentService, positionService } from './organizationService'
import Pagination from '@/components/Pagination'
import type { PagedResult } from '@/types/pagination'
import type { Department, Position } from '@/types/organization'
import { createTour } from '@/utils/tour'
import HelpButton from '@/components/HelpButton'

type Tab  = 'departments' | 'positions'
type Item = { id: string; name: string; description: string | null; employeeCount: number }

const PAGE_SIZE_OPTIONS = [10, 20, 50]

// ── Modal crear / editar ────────────────────────────────────────────────────
interface ItemModalProps {
  title:   string
  editing: Item | null
  onClose: () => void
  onSave:  (name: string, description: string | null) => Promise<void>
  saving:  boolean
  error:   string | null
}

function ItemModal({ title, editing, onClose, onSave, saving, error }: ItemModalProps) {
  const [name, setName]       = useState(editing?.name ?? '')
  const [desc, setDesc]       = useState(editing?.description ?? '')
  const [nameErr, setNameErr] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setNameErr('El nombre es requerido'); return }
    await onSave(name.trim(), desc.trim() || null)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" style={{ marginTop: 0 }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
            <input
              value={name} onChange={e => { setName(e.target.value); setNameErr('') }}
              className="input-field" placeholder="Ej: Recursos Humanos"
            />
            {nameErr && <p className="text-red-500 text-xs mt-1">{nameErr}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea
              value={desc} onChange={e => setDesc(e.target.value)} rows={3}
              className="input-field resize-none" placeholder="Descripción opcional..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white rounded-lg text-sm font-medium">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Guardando...' : editing ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Página principal ────────────────────────────────────────────────────────
function OrganizationPageInner() {
  const [tab, setTab] = useState<Tab>('departments')

  const [deptResult,  setDeptResult]  = useState<PagedResult<Department> | null>(null)
  const [posResult,   setPosResult]   = useState<PagedResult<Position>   | null>(null)
  const [deptPage,    setDeptPage]    = useState(1)
  const [posPage,     setPosPage]     = useState(1)
  const [deptPgSize,  setDeptPgSize]  = useState(10)
  const [posPgSize,   setPosPgSize]   = useState(10)
  const [deptSearch,  setDeptSearch]  = useState('')
  const [posSearch,   setPosSearch]   = useState('')
  const [deptInput,   setDeptInput]   = useState('')
  const [posInput,    setPosInput]    = useState('')
  const [loadingDept, setLoadingDept] = useState(true)
  const [loadingPos,  setLoadingPos]  = useState(true)

  const [modalItem,   setModalItem]   = useState<Item | null | 'new'>()
  const [deleteItem,  setDeleteItem]  = useState<Item | null>(null)
  const [reassignTo,  setReassignTo]  = useState('')
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleting,    setDeleting]    = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [modalError,  setModalError]  = useState<string | null>(null)

  const loadDepts = useCallback(async (page: number, pageSize: number, search: string) => {
    setLoadingDept(true)
    try {
      setDeptResult(await departmentService.getPaged({ page, pageSize, search: search || undefined }))
    } catch { /* */ } finally { setLoadingDept(false) }
  }, [])

  const loadPos = useCallback(async (page: number, pageSize: number, search: string) => {
    setLoadingPos(true)
    try {
      setPosResult(await positionService.getPaged({ page, pageSize, search: search || undefined }))
    } catch { /* */ } finally { setLoadingPos(false) }
  }, [])

  useEffect(() => { loadDepts(deptPage, deptPgSize, deptSearch) }, [loadDepts, deptPage, deptPgSize, deptSearch])
  useEffect(() => { loadPos(posPage, posPgSize, posSearch)       }, [loadPos,   posPage,  posPgSize,  posSearch])

  // Debounce search
  const deptTimer = useRef<ReturnType<typeof setTimeout>>()
  const posTimer  = useRef<ReturnType<typeof setTimeout>>()

  const handleDeptInput = (val: string) => {
    setDeptInput(val)
    clearTimeout(deptTimer.current)
    deptTimer.current = setTimeout(() => { setDeptSearch(val); setDeptPage(1) }, 300)
  }

  const handlePosInput = (val: string) => {
    setPosInput(val)
    clearTimeout(posTimer.current)
    posTimer.current = setTimeout(() => { setPosSearch(val); setPosPage(1) }, 300)
  }

  const isDept = tab === 'departments'

  const handleSave = async (name: string, description: string | null) => {
    setSaving(true); setModalError(null)
    const isNew = modalItem === 'new'
    try {
      if (isDept) {
        if (!isNew && modalItem) await departmentService.update(modalItem.id, { name, description })
        else                     await departmentService.create({ name, description })
        await loadDepts(deptPage, deptPgSize, deptSearch)
      } else {
        if (!isNew && modalItem) await positionService.update(modalItem.id, { name, description })
        else                     await positionService.create({ name, description })
        await loadPos(posPage, posPgSize, posSearch)
      }
      setModalItem(undefined)
      toast.success(isNew ? `${label} creado correctamente.` : `${label} actualizado correctamente.`)
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Error al guardar.'
      setModalError(msg)
      if (!isHandledError(err)) toast.error(msg)
    } finally { setSaving(false) }
  }

  const openDelete = (item: Item) => {
    setDeleteItem(item)
    setReassignTo('')
    setDeleteError(null)
  }

  const handleDelete = async () => {
    if (!deleteItem) return
    const needsReassign = deleteItem.employeeCount > 0
    if (needsReassign && !reassignTo) {
      setDeleteError(`Selecciona el ${isDept ? 'departamento' : 'cargo'} al que reasignarás los empleados.`)
      return
    }
    setDeleting(true); setDeleteError(null)
    try {
      if (isDept) {
        await departmentService.delete(deleteItem.id, reassignTo || undefined)
        await loadDepts(deptPage, deptPgSize, deptSearch)
      } else {
        await positionService.delete(deleteItem.id, reassignTo || undefined)
        await loadPos(posPage, posPgSize, posSearch)
      }
      setDeleteItem(null)
      toast.success(`${label} eliminado correctamente.`)
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'No se pudo eliminar.'
      setDeleteError(msg)
      toast.error(msg)
    } finally { setDeleting(false) }
  }

  const result     = isDept ? deptResult  : posResult
  const page       = isDept ? deptPage    : posPage
  const pageSize   = isDept ? deptPgSize  : posPgSize
  const searchInput = isDept ? deptInput  : posInput
  const loading    = isDept ? loadingDept : loadingPos
  const label      = isDept ? 'Departamento' : 'Cargo'
  const Icon       = isDept ? Building : Briefcase

  const items: Item[]  = (result?.items ?? []) as Item[]
  const totalCount     = result?.totalCount ?? 0
  const totalPages     = result?.totalPages ?? 1

  const handlePageChange = (p: number) => {
    if (isDept) setDeptPage(p)
    else        setPosPage(p)
  }

  const handlePageSizeChange = (n: number) => {
    if (isDept) { setDeptPgSize(n); setDeptPage(1) }
    else        { setPosPgSize(n);  setPosPage(1)  }
  }

  const handleSearchInput = isDept ? handleDeptInput : handlePosInput

  function runTour() {
    createTour([
      { element: '#tour-org-tabs',   title: 'Departamentos y Cargos', description: 'Este módulo tiene dos catálogos: Departamentos (áreas de la empresa) y Cargos (puestos de trabajo). Los empleados deben tener asignado un departamento y cargo para poder ser registrados.' },
      { element: '#tour-org-new',    title: 'Crear nuevo',            description: 'Crea un nuevo departamento o cargo con el botón "+ Nuevo". Debes tener al menos un departamento antes de dar de alta empleados.' },
      { element: '#tour-org-table',  title: 'Tabla de registros',     description: 'Aquí se listan todos los departamentos o cargos. Puedes editar o eliminar cada uno con los botones de la columna de acciones. Al eliminar un departamento debes reasignar sus empleados.' },
    ]).drive()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Catálogos</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {loading ? '…' : `${totalCount} ${label.toLowerCase()}${totalCount !== 1 ? 's' : ''} registrado${totalCount !== 1 ? 's' : ''}`}
          </p>
          <div className="mt-1"><HelpButton onClick={runTour} /></div>
        </div>
        <div className="sm:ml-auto flex flex-wrap gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={searchInput}
              onChange={e => handleSearchInput(e.target.value)}
              placeholder={`Buscar ${label.toLowerCase()}...`}
              className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-52"
            />
          </div>
          <button
            id="tour-org-new"
            onClick={() => { setModalError(null); setModalItem('new') }}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Nuevo {label}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div id="tour-org-tabs" className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {([
          { key: 'departments', label: 'Departamentos', icon: Building },
          { key: 'positions',   label: 'Cargos',        icon: Briefcase },
        ] as const).map(({ key, label: tabLabel, icon: TabIcon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === key ? 'bg-white shadow-sm text-primary-700' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <TabIcon className="w-4 h-4" />
            {tabLabel}
          </button>
        ))}
      </div>

      {/* Tabla */}
      <div id="tour-org-table" className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <Icon className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-sm">{searchInput ? 'Sin resultados' : `No hay ${label.toLowerCase()}s registrados`}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['#', 'Nombre', 'Descripción', 'Empleados', 'Acciones'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-xs text-gray-400 tabular-nums">{(page - 1) * pageSize + idx + 1}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                      <td className="px-4 py-3 text-gray-500">{item.description ?? <span className="text-gray-300">—</span>}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600">
                          <Users className="w-3.5 h-3.5" /> {item.employeeCount}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => { setModalError(null); setModalItem(item) }}
                            className="p-1.5 rounded hover:bg-blue-50 text-blue-600 transition-colors" title="Editar">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => openDelete(item)}
                            className="p-1.5 rounded hover:bg-red-50 text-red-500 transition-colors" title="Eliminar">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page} totalPages={totalPages} totalCount={totalCount} pageSize={pageSize}
              onPageChange={handlePageChange}
              pageSizeOptions={PAGE_SIZE_OPTIONS} onPageSizeChange={handlePageSizeChange}
            />
          </>
        )}
      </div>

      {/* Modal crear / editar */}
      {modalItem !== undefined && (
        <ItemModal
          title={modalItem === 'new' ? `Nuevo ${label}` : `Editar ${label}`}
          editing={modalItem === 'new' ? null : modalItem}
          onClose={() => setModalItem(undefined)}
          onSave={handleSave}
          saving={saving}
          error={modalError}
        />
      )}

      {/* Modal eliminar */}
      {deleteItem && (() => {
        const hasEmployees  = deleteItem.employeeCount > 0
        const otherItems    = (isDept ? (deptResult?.items ?? []) : (posResult?.items ?? [])) as Item[]
        const others        = otherItems.filter(i => i.id !== deleteItem.id)
        const singularLabel = isDept ? 'departamento' : 'cargo'

        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" style={{ marginTop: 0 }}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">

              {/* Caso 1: tiene empleados → reasignar */}
              {hasEmployees && (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                      <Trash2 className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold">Eliminar {singularLabel}</h3>
                      <p className="text-xs text-gray-500">{deleteItem.name}</p>
                    </div>
                  </div>

                  <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                    Este {singularLabel} tiene <strong>{deleteItem.employeeCount} empleado{deleteItem.employeeCount !== 1 ? 's' : ''}</strong> asignado{deleteItem.employeeCount !== 1 ? 's' : ''}.
                    Selecciona el {singularLabel} al que quieres reasignarlos:
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
                      <option value="">— Selecciona un {singularLabel} —</option>
                      {others.map(o => (
                        <option key={o.id} value={o.id}>
                          {o.name} ({o.employeeCount} emp.)
                        </option>
                      ))}
                    </select>
                  </div>

                  {deleteError && (
                    <p className="text-red-600 text-sm mb-3 bg-red-50 rounded-lg px-3 py-2">{deleteError}</p>
                  )}

                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => { setDeleteItem(null); setDeleteError(null) }}
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

              {/* Caso 2: sin empleados → confirmación simple */}
              {!hasEmployees && (
                <>
                  <div className="flex flex-col items-center text-center gap-3 mb-5">
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                      <Trash2 className="w-6 h-6 text-red-500" />
                    </div>
                    <h3 className="text-lg font-semibold">¿Eliminar {singularLabel}?</h3>
                    <p className="text-sm text-gray-500">
                      Se eliminará <strong>{deleteItem.name}</strong>. Esta acción no se puede deshacer.
                    </p>
                  </div>

                  {deleteError && (
                    <p className="text-red-600 text-sm mb-3 bg-red-50 rounded-lg px-3 py-2 text-center">{deleteError}</p>
                  )}

                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => { setDeleteItem(null); setDeleteError(null) }}
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

export default function OrganizationPage() {
  return <PlanGate capability="organization"><OrganizationPageInner /></PlanGate>
}
