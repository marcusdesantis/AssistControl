import { useEffect, useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Plus, Search, Pencil, X, UserCheck, Loader2, KeyRound, Lock, Unlock, Copy, CheckCheck, Eye, EyeOff, RefreshCw, Send, ToggleRight, ToggleLeft, Bell } from 'lucide-react'
import { isHandledError } from '@/services/api'
import { copyText } from '@/utils/clipboard'
import { createTour } from '@/utils/tour'
import HelpButton from '@/components/HelpButton'
import { employeeService } from './employeeService'
import { scheduleService } from '@/features/schedules/scheduleService'
import { departmentService, positionService } from '@/features/organization/organizationService'
import Pagination from '@/components/Pagination'
import type { Employee, CreateEmployeeRequest, UpdateEmployeeRequest, EmployeeStatus } from '@/types/employee'
import type { Schedule } from '@/types/schedule'
import type { Department, Position } from '@/types/organization'
import type { PagedResult } from '@/types/pagination'


const STATUS_OPTIONS: { value: EmployeeStatus | ''; label: string }[] = [
  { value: '',         label: 'Todos los estados' },
  { value: 'Active',   label: 'Activo' },
  { value: 'Inactive', label: 'Inactivo' },
]

const STATUS_FORM_OPTIONS: { value: EmployeeStatus; label: string }[] = [
  { value: 'Active',   label: 'Activo' },
  { value: 'Inactive', label: 'Inactivo' },
]

type FormData = {
  employeeCode: string
  firstName:    string
  lastName:     string
  departmentId: string
  positionId:   string
  email:        string
  hireDate:     string
  phone:        string
  status:       EmployeeStatus
  scheduleId:   string
  username:     string
  password:     string
  newPassword:  string
  pin:          string
  clearPin:     boolean
}

interface Credentials {
  employeeId:   string
  employeeCode: string
  pin:          string | null
  username:     string
  appPassword:  string | null
  isUpdate?:    boolean
}

const PAGE_SIZE_OPTIONS = [10, 20, 50]

export default function EmployeesPage() {
  const [result,          setResult]          = useState<PagedResult<Employee> | null>(null)
  const [schedules,       setSchedules]       = useState<Schedule[]>([])
  const [departments,     setDepartments]     = useState<Department[]>([])
  const [positions,       setPositions]       = useState<Position[]>([])
  const [loading,         setLoading]         = useState(true)
  const [search,          setSearch]          = useState('')
  const [searchInput,     setSearchInput]     = useState('')
  const [statusFilter,    setStatusFilter]    = useState('')
  const [page,            setPage]            = useState(1)
  const [pageSize,        setPageSize]        = useState(10)
  const [showModal,       setShowModal]       = useState(false)
  const [editing,         setEditing]         = useState<Employee | null>(null)
  const [saving,          setSaving]          = useState(false)
  const [confirmDeact,    setConfirmDeact]    = useState<Employee | null>(null)
  const [togglingId,      setTogglingId]      = useState<string | null>(null)
  const [formError,       setFormError]       = useState<string | null>(null)
  const [codeUnlocked,    setCodeUnlocked]    = useState(false)
  const [nextCodeLoading, setNextCodeLoading] = useState(false)
  const [credentials,     setCredentials]     = useState<Credentials | null>(null)
  const [sendingCreds,    setSendingCreds]    = useState<string | null>(null)
  const [copiedCode,      setCopiedCode]      = useState(false)
  const [copiedPin,       setCopiedPin]       = useState(false)
  const [copiedUsername,  setCopiedUsername]  = useState(false)
  const [copiedPassword,  setCopiedPassword]  = useState(false)
  const [copiedAll,       setCopiedAll]       = useState(false)
  const [showCreatePass,  setShowCreatePass]  = useState(false)
  const [showEditPass,    setShowEditPass]    = useState(false)
  const [showCredPass,    setShowCredPass]    = useState(false)
  const [notifyTarget,    setNotifyTarget]    = useState<Employee | null>(null)
  const [notifyTitle,     setNotifyTitle]     = useState('')
  const [notifyBody,      setNotifyBody]      = useState('')
  const [notifyType,      setNotifyType]      = useState('info')
  const [sendingNotif,    setSendingNotif]    = useState(false)

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>()
  const watchedCode    = watch('employeeCode')
  const watchedPass    = watch('password')
  const watchedNewPass = watch('newPassword')

  const load = useCallback(async (p = page) => {
    setLoading(true)
    try {
      const data = await employeeService.getPaged({ page: p, pageSize, search, status: statusFilter || undefined })
      setResult(data)
    } catch { /* silent */ } finally { setLoading(false) }
  }, [page, pageSize, search, statusFilter])

  useEffect(() => {
    scheduleService.getAll().then(setSchedules).catch(() => {})
    departmentService.getAll().then(setDepartments).catch(() => {})
    positionService.getAll().then(setPositions).catch(() => {})
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1) }, 300)
    return () => clearTimeout(t)
  }, [searchInput])

  const handleStatusChange = (val: string) => { setStatusFilter(val); setPage(1) }
  const handlePageSize = (n: number) => { setPageSize(n); setPage(1) }

  const openCreate = async () => {
    setCodeUnlocked(false)
    setFormError(null)
    setEditing(null)
    reset({ status: 'Active', hireDate: new Date().toISOString().split('T')[0], scheduleId: schedules[0]?.id ?? '' })
    setShowModal(true)

    setNextCodeLoading(true)
    try {
      const { nextCode } = await employeeService.getNextCode()
      setValue('employeeCode', nextCode)
    } catch {
      setValue('employeeCode', '')
    } finally {
      setNextCodeLoading(false)
    }
  }

  const openEdit = (emp: Employee) => {
    reset({
      employeeCode: emp.employeeCode,
      firstName: emp.firstName, lastName: emp.lastName,
      departmentId: emp.departmentId ?? '',
      positionId:   emp.positionId   ?? '',
      email: emp.email, hireDate: emp.hireDate, phone: emp.phone ?? '',
      status: emp.status, scheduleId: emp.scheduleId ?? '',
      username:    emp.username        ?? '',
      newPassword: emp.passwordDisplay ?? '',
    })
    setEditing(emp); setFormError(null); setShowModal(true)
  }

  const onSubmit = async (data: FormData) => {
    setSaving(true); setFormError(null)
    try {
      if (editing) {
        const payload: UpdateEmployeeRequest = {
          firstName: data.firstName, lastName: data.lastName,
          departmentId: data.departmentId || null,
          positionId:   data.positionId   || null,
          email: data.email, hireDate: data.hireDate,
          status: data.status, scheduleId: data.scheduleId,
          phone:        data.phone        || undefined,
          pin:          data.pin          || undefined,
          clearPin:     data.clearPin,
          username:     data.username     || undefined,
          newPassword:  (data.newPassword && data.newPassword !== editing.passwordDisplay) ? data.newPassword : undefined,
        }
        await employeeService.update(editing.id, payload)
        setShowModal(false); load()
        toast.success('Empleado actualizado correctamente.')
      } else {
        const payload: CreateEmployeeRequest = {
          employeeCode: codeUnlocked ? (data.employeeCode || null) : null,
          firstName: data.firstName, lastName: data.lastName,
          departmentId: data.departmentId || null,
          positionId:   data.positionId   || null,
          email: data.email, hireDate: data.hireDate, scheduleId: data.scheduleId,
          username: data.username || undefined,
          password: data.password || undefined,
          phone: data.phone || undefined, pin: data.pin || undefined,
        }
        const result = await employeeService.create(payload)
        setShowModal(false); load()
        setShowCreatePass(false)
        setShowCredPass(false)
        setCopiedAll(false)
        setCredentials({
          employeeId:   result.employee.id,
          employeeCode: result.employee.employeeCode,
          pin:          result.generatedPin,
          username:     result.employee.username,
          appPassword:  result.generatedPassword ?? (data.password || null),
        })
        toast.success('Empleado creado correctamente.')
      }
    } catch (err: any) {
      setFormError(err?.response?.data?.message ?? 'Error al guardar el empleado.')
      if (!isHandledError(err)) toast.error(err?.response?.data?.message ?? 'Error al guardar el empleado.')
    } finally { setSaving(false) }
  }

  const handleSendCredentials = async (id: string, email?: string) => {
    setSendingCreds(id)
    try {
      await employeeService.sendCredentials(id)
      toast.success(email ? `Credenciales enviadas a ${email}` : 'Credenciales enviadas por correo.')
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? err?.message ?? 'Error al enviar credenciales.')
    } finally {
      setSendingCreds(null)
    }
  }

  const runTour = () => createTour([
    { element: '#tour-emp-list',     title: '¿Quiénes aparecen aquí?',         description: 'Lista todos los empleados de tu empresa. Solo los empleados en estado <b>Activo</b> pueden registrar asistencia y aparecer en el reloj checador.' },
    { element: '#tour-emp-new',      title: 'Crear nuevo empleado',             description: 'Abre el formulario de registro. <b>⚠ El campo Horario es obligatorio</b> — sin horario asignado el empleado no puede registrar asistencia correctamente. Asegúrate de tener horarios creados primero en el módulo de Horarios.' },
    { element: '#tour-emp-table',    title: 'Tabla de empleados',               description: 'Muestra código, nombre, departamento, cargo, horario asignado y estado. Puedes buscar por nombre o código y filtrar por estado.' },
    { element: '#tour-emp-actions',  title: 'Acciones por empleado',            description: '<b>Editar</b>: modifica datos o cambia el horario. <b>Credenciales</b>: genera nueva contraseña para la app móvil. <b>Enviar correo</b>: envía sus credenciales por email (requiere SMTP activo en Configuración). <b>Desactivar/Activar</b>: no elimina, solo cambia el estado.' },
  ]).drive()

  const handleToggle = async (emp: Employee) => {
    if (emp.status === 'Active') { setConfirmDeact(emp); return }
    setTogglingId(emp.id)
    try {
      await employeeService.toggleStatus(emp)
      load()
      toast.success('Empleado activado.')
    } catch { toast.error('No se pudo cambiar el estado.') }
    finally { setTogglingId(null) }
  }

  const confirmDeactivate = async () => {
    if (!confirmDeact) return
    setTogglingId(confirmDeact.id)
    try {
      await employeeService.toggleStatus(confirmDeact)
      setConfirmDeact(null); load()
      toast.success('Empleado desactivado.')
    } catch { toast.error('No se pudo desactivar el empleado.') }
    finally { setTogglingId(null) }
  }

  const sendNotification = async () => {
    if (!notifyTarget || !notifyTitle.trim() || !notifyBody.trim()) return
    setSendingNotif(true)
    try {
      await employeeService.notify(notifyTarget.id, { title: notifyTitle, body: notifyBody, type: notifyType })
      toast.success('Notificación enviada correctamente.')
      setNotifyTarget(null); setNotifyTitle(''); setNotifyBody(''); setNotifyType('info')
    } catch { toast.error('Error al enviar la notificación.') }
    finally { setSendingNotif(false) }
  }

  const copyToClipboard = async (text: string, setter: (v: boolean) => void) => {
    try {
      await copyText(text)
      setter(true)
      setTimeout(() => setter(false), 2000)
    } catch { /* silent */ }
  }

  const generateRandomPassword = () => {
    const upper   = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
    const lower   = 'abcdefghijkmnpqrstuvwxyz'
    const digits  = '23456789'
    const special = '@#$%'
    let pass = [
      upper[Math.floor(Math.random() * upper.length)],
      lower[Math.floor(Math.random() * lower.length)],
      lower[Math.floor(Math.random() * lower.length)],
      digits[Math.floor(Math.random() * digits.length)],
      digits[Math.floor(Math.random() * digits.length)],
      special[Math.floor(Math.random() * special.length)],
      lower[Math.floor(Math.random() * lower.length)],
      digits[Math.floor(Math.random() * digits.length)],
    ]
    pass = pass.sort(() => Math.random() - 0.5)
    return pass.join('')
  }

  const copyAllCredentials = async (creds: Credentials) => {
    const lines = [
      `Código empleado: ${creds.employeeCode}`,
      `Usuario app:     ${creds.username}`,
      creds.appPassword ? `Contraseña app:  ${creds.appPassword}` : null,
      creds.pin         ? `PIN checador:    ${creds.pin}`         : null,
    ].filter(Boolean).join('\n')
    try {
      await copyText(lines)
      setCopiedAll(true)
      setTimeout(() => setCopiedAll(false), 2000)
    } catch { /* silent */ }
  }

  const employees  = result?.items ?? []
  const totalCount = result?.totalCount ?? 0
  const totalPages = result?.totalPages ?? 1

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Empleados</h1>
            <HelpButton onClick={runTour} />
          </div>
          <p className="text-gray-500 text-sm mt-0.5">
            {loading ? '…' : `${totalCount} empleados registrados`}
          </p>
        </div>
        <div className="sm:ml-auto flex flex-wrap gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={searchInput} onChange={e => setSearchInput(e.target.value)}
              placeholder="Buscar nombre, código..." className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-52"
            />
          </div>
          <select value={statusFilter} onChange={e => handleStatusChange(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button id="tour-emp-new" onClick={openCreate}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> Nuevo
          </button>
        </div>
      </div>

      {/* Table */}
      <div id="tour-emp-list" className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
          </div>
        ) : employees.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <UserCheck className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-sm">{search || statusFilter ? 'Sin resultados' : 'No hay empleados registrados'}</p>
          </div>
        ) : (
          <>
            <div id="tour-emp-table" className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['#', 'Código', 'Nombre', 'Departamento', 'Cargo', 'Horario', 'Estado', 'Acciones'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {employees.map((emp, idx) => (
                    <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-xs text-gray-400 tabular-nums">{(page - 1) * pageSize + idx + 1}</td>
                      <td className="px-4 py-3 font-mono text-xs font-medium text-gray-600">{emp.employeeCode}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{emp.fullName}</div>
                        <div className="text-xs text-gray-400">{emp.email}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{emp.departmentName ?? <span className="text-gray-300">—</span>}</td>
                      <td className="px-4 py-3 text-gray-600">{emp.positionName ?? <span className="text-gray-300">—</span>}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{emp.scheduleName ?? '—'}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggle(emp)}
                          disabled={togglingId === emp.id}
                          className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${emp.status === 'Active' ? 'text-emerald-600 hover:text-emerald-800' : 'text-gray-400 hover:text-gray-700'}`}
                        >
                          {togglingId === emp.id
                            ? <Loader2 className="w-5 h-5 animate-spin" />
                            : emp.status === 'Active'
                              ? <ToggleRight className="w-5 h-5" />
                              : <ToggleLeft className="w-5 h-5" />}
                          {emp.status === 'Active' ? 'Activo' : 'Inactivo'}
                        </button>
                      </td>
                      <td id={idx === 0 ? 'tour-emp-actions' : undefined} className="px-4 py-3">
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleSendCredentials(emp.id, emp.email)}
                            disabled={sendingCreds === emp.id}
                            className="p-1.5 rounded hover:bg-green-50 text-green-600 transition-colors disabled:opacity-40"
                            title="Enviar credenciales por correo"
                          >
                            {sendingCreds === emp.id
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : <Send className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => { setNotifyTarget(emp); setNotifyTitle(''); setNotifyBody(''); setNotifyType('info') }}
                            className="p-1.5 rounded hover:bg-amber-50 text-amber-600 transition-colors"
                            title="Enviar notificación al empleado"
                          >
                            <Bell className="w-4 h-4" />
                          </button>
                          <button onClick={() => openEdit(emp)} className="p-1.5 rounded hover:bg-blue-50 text-blue-600 transition-colors" title="Editar">
                            <Pencil className="w-4 h-4" />
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
              onPageChange={p => { setPage(p); load(p) }}
              pageSizeOptions={PAGE_SIZE_OPTIONS} onPageSizeChange={handlePageSize}
            />
          </>
        )}
      </div>

      {/* Modal Crear/Editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" style={{ marginTop: 0 }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b shrink-0">
              <h2 className="text-lg font-semibold">{editing ? 'Editar Empleado' : 'Nuevo Empleado'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0" autoComplete="off">
              {/* Honeypot: evita que Chrome rellene campos de usuario/contraseña con datos del empleado */}
              <input type="text"     name="fake_user" style={{ display: 'none' }} autoComplete="username"     readOnly tabIndex={-1} />
              <input type="password" name="fake_pass" style={{ display: 'none' }} autoComplete="new-password" readOnly tabIndex={-1} />
              <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
                {formError && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{formError}</div>}
                <div className="grid grid-cols-2 gap-4">

                  {/* Código (solo creación) */}
                  {!editing && (
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Código de empleado</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          {nextCodeLoading ? (
                            <div className="input-field flex items-center gap-2 text-gray-400">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span className="text-sm">Generando...</span>
                            </div>
                          ) : (
                            <input
                              {...register('employeeCode', codeUnlocked ? { required: 'Requerido', maxLength: { value: 20, message: 'Máx. 20 caracteres' } } : {})}
                              className={`input-field font-mono ${!codeUnlocked ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`}
                              readOnly={!codeUnlocked} placeholder="Auto-generado"
                            />
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const next = !codeUnlocked
                            setCodeUnlocked(next)
                            if (!next)
                              employeeService.getNextCode().then(({ nextCode }) => setValue('employeeCode', nextCode)).catch(() => {})
                          }}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-colors ${
                            codeUnlocked ? 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100' : 'bg-gray-50 border-gray-300 text-gray-500 hover:bg-gray-100'
                          }`}
                        >
                          {codeUnlocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                          {codeUnlocked ? 'Manual' : 'Auto'}
                        </button>
                      </div>
                      {!codeUnlocked && watchedCode && (
                        <p className="text-xs text-gray-400 mt-1">Código asignado: <span className="font-mono font-medium text-gray-600">{watchedCode}</span></p>
                      )}
                      {errors.employeeCode && <p className="text-red-500 text-xs mt-1">{errors.employeeCode.message}</p>}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                    <input {...register('firstName', { required: 'Requerido' })} className="input-field" placeholder="Juan" />
                    {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Apellido *</label>
                    <input {...register('lastName', { required: 'Requerido' })} className="input-field" placeholder="Pérez" />
                    {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName.message}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Departamento</label>
                    <select {...register('departmentId')} className="input-field">
                      <option value="">— Sin departamento —</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cargo</label>
                    <select {...register('positionId')} className="input-field">
                      <option value="">— Sin cargo —</option>
                      {positions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input {...register('email', { required: 'Requerido', pattern: { value: /^\S+@\S+$/i, message: 'Email inválido' } })}
                      className="input-field" placeholder="juan@empresa.com" type="email" />
                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                    <input {...register('phone')} className="input-field" placeholder="+593 99 000 0000" type="tel" autoComplete="tel" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de ingreso *</label>
                    <input {...register('hireDate', { required: 'Requerido' })} className="input-field" type="date" />
                    {errors.hireDate && <p className="text-red-500 text-xs mt-1">{errors.hireDate.message}</p>}
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Horario *</label>
                    <select {...register('scheduleId', { required: 'Requerido' })} className="input-field">
                      <option value="">— Seleccionar horario —</option>
                      {schedules.map(s => <option key={s.id} value={s.id}>{s.name} ({s.typeLabel})</option>)}
                    </select>
                    {errors.scheduleId && <p className="text-red-500 text-xs mt-1">{errors.scheduleId.message}</p>}
                  </div>
                  {editing && (
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                      <select {...register('status')} className="input-field">
                        {STATUS_FORM_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                  )}

                  {/* Acceso a la app móvil */}
                  <div className="col-span-2 border-t pt-4 mt-1">
                    <div className="flex items-center gap-2 mb-3">
                      <KeyRound className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700">Acceso a la app móvil</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">
                          {editing ? 'Usuario' : 'Usuario (vacío = auto-generar)'}
                        </label>
                        <input {...register('username', {
                          pattern: { value: /^[a-z0-9._-]{3,50}$/, message: 'Solo letras minúsculas, números y ._-' }
                        })}
                          type="text" className="input-field" placeholder="ej. emp001" autoComplete="off" />
                        {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username.message}</p>}
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">
                          {editing ? 'Nueva contraseña (vacío = sin cambio)' : 'Contraseña (vacío = auto-generar)'}
                        </label>
                        <div className="flex gap-1.5">
                          <div className="relative flex-1">
                            <input
                              {...register(editing ? 'newPassword' : 'password')}
                              type={editing ? (showEditPass ? 'text' : 'password') : (showCreatePass ? 'text' : 'password')}
                              className={`input-field ${(editing ? watchedNewPass : watchedPass) ? 'pr-9' : ''}`}
                              placeholder="••••••••"
                              autoComplete="new-password"
                            />
                            {(editing ? watchedNewPass : watchedPass) && (
                              <button
                                type="button"
                                onClick={() => editing ? setShowEditPass(v => !v) : setShowCreatePass(v => !v)}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                tabIndex={-1}
                              >
                                {(editing ? showEditPass : showCreatePass)
                                  ? <EyeOff className="w-4 h-4" />
                                  : <Eye className="w-4 h-4" />}
                              </button>
                            )}
                          </div>
                          <button
                            type="button"
                            title="Generar contraseña aleatoria"
                            onClick={() => {
                              const pwd = generateRandomPassword()
                              setValue(editing ? 'newPassword' : 'password', pwd)
                              if (editing) setShowEditPass(true)
                              else setShowCreatePass(true)
                            }}
                            className="px-2.5 py-2 rounded-lg border border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors shrink-0"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                    {!editing && <p className="text-xs text-gray-400 mt-1">Si no especificas se generarán automáticamente.</p>}
                  </div>

                  {/* PIN */}
                  <div className="col-span-2 border-t pt-4 mt-1">
                    <div className="flex items-center gap-2 mb-3">
                      <KeyRound className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700">
                        {editing ? `PIN checador${editing.hasPin ? ' (activo)' : ''}` : 'PIN del reloj checador'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className={editing ? '' : 'col-span-2'}>
                        <label className="block text-xs text-gray-500 mb-1">
                          {editing ? 'Nuevo PIN (vacío = sin cambio)' : 'PIN (4-6 dígitos — vacío = auto-generar)'}
                        </label>
                        <input {...register('pin', { pattern: { value: /^\d{4,6}$/, message: '4-6 dígitos numéricos' } })}
                          type="password" inputMode="numeric" maxLength={6} className="input-field" placeholder="••••" />
                        {errors.pin && <p className="text-red-500 text-xs mt-1">{errors.pin.message}</p>}
                        {!editing && <p className="text-xs text-gray-400 mt-1">Si no especificas un PIN se generará uno automáticamente de 6 dígitos.</p>}
                      </div>
                      {editing?.hasPin && (
                        <div className="flex items-end pb-0.5">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" {...register('clearPin')} className="w-4 h-4 rounded" />
                            <span className="text-xs text-red-600">Quitar PIN</span>
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 p-6 border-t shrink-0">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white rounded-lg text-sm font-medium">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? 'Guardando...' : editing ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal credenciales */}
      {credentials && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" style={{ marginTop: 0 }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-semibold">{credentials.isUpdate ? 'Credenciales actualizadas' : 'Empleado creado'}</h3>
              <button onClick={() => setCredentials(null)} className="p-1 rounded hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">Guarda estas credenciales — no se volverán a mostrar.</p>

            {/* 1. Código de empleado */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-2">
              <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">Código de empleado</p>
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-xl font-bold text-blue-800">{credentials.employeeCode}</span>
                <button onClick={() => copyToClipboard(credentials.employeeCode, setCopiedCode)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs font-medium transition-colors shrink-0">
                  {copiedCode ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedCode ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            </div>

            {/* 2. PIN checador */}
            {credentials.pin ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-2">
                <p className="text-xs font-medium text-amber-600 uppercase tracking-wide mb-1">PIN checador</p>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-xl font-bold text-amber-800 tracking-widest">{credentials.pin}</span>
                  <button onClick={() => copyToClipboard(credentials.pin!, setCopiedPin)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-700 text-xs font-medium transition-colors shrink-0">
                    {copiedPin ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedPin ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
                <p className="text-xs text-amber-600 mt-1.5">Solo se muestra una vez.</p>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 mb-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">PIN checador</p>
                <p className="text-sm text-gray-600">PIN personalizado configurado.</p>
              </div>
            )}

            {/* 3. Usuario app */}
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 mb-2">
              <p className="text-xs font-medium text-purple-600 uppercase tracking-wide mb-1">Usuario app móvil</p>
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-base font-bold text-purple-800">{credentials.username}</span>
                <button onClick={() => copyToClipboard(credentials.username, setCopiedUsername)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-700 text-xs font-medium transition-colors shrink-0">
                  {copiedUsername ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedUsername ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            </div>

            {/* 4. Contraseña app */}
            {credentials.appPassword && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-3">
                <p className="text-xs font-medium text-green-600 uppercase tracking-wide mb-1">Contraseña app móvil</p>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-base font-bold text-green-800 tracking-wide">
                      {showCredPass ? credentials.appPassword : '•'.repeat(credentials.appPassword.length)}
                    </span>
                    <button type="button" onClick={() => setShowCredPass(v => !v)}
                      className="text-green-500 hover:text-green-700 shrink-0">
                      {showCredPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <button onClick={() => copyToClipboard(credentials.appPassword!, setCopiedPassword)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 text-xs font-medium transition-colors shrink-0">
                    {copiedPassword ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedPassword ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
                <p className="text-xs text-green-600 mt-1.5">Solo se muestra una vez.</p>
              </div>
            )}

            {/* Botones */}
            <button
              onClick={() => copyAllCredentials(credentials)}
              className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-300 hover:bg-gray-50 rounded-lg text-sm font-medium text-gray-700 transition-colors mb-2">
              {copiedAll ? <CheckCheck className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              {copiedAll ? '¡Todo copiado!' : 'Copiar todo'}
            </button>
            <button
              onClick={() => handleSendCredentials(credentials.employeeId)}
              disabled={sendingCreds === credentials.employeeId}
              className="w-full flex items-center justify-center gap-2 py-2.5 border border-green-300 hover:bg-green-50 rounded-lg text-sm font-medium text-green-700 transition-colors mb-2 disabled:opacity-40">
              {sendingCreds === credentials.employeeId
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Send className="w-4 h-4" />}
              {sendingCreds === credentials.employeeId ? 'Enviando...' : 'Enviar por correo'}
            </button>
            <button onClick={() => setCredentials(null)}
              className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors">
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Modal enviar notificación */}
      {notifyTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" style={{ marginTop: 0 }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-500" />
                <h2 className="text-base font-semibold text-gray-900">Enviar notificación</h2>
              </div>
              <button onClick={() => setNotifyTarget(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-gray-500">Para: <span className="font-medium text-gray-800">{notifyTarget.fullName}</span></p>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Título</label>
                <input value={notifyTitle} onChange={e => setNotifyTitle(e.target.value)}
                  placeholder="Ej: Recordatorio importante"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
                <select value={notifyType} onChange={e => setNotifyType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400">
                  <option value="info">Información</option>
                  <option value="success">Éxito</option>
                  <option value="warning">Advertencia</option>
                  <option value="error">Alerta</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Mensaje</label>
                <textarea value={notifyBody} onChange={e => setNotifyBody(e.target.value)} rows={4}
                  placeholder="Escribe el mensaje de la notificación..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none" />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setNotifyTarget(null)}
                  className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
                <button onClick={sendNotification} disabled={sendingNotif || !notifyTitle.trim() || !notifyBody.trim()}
                  className="flex-1 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
                  {sendingNotif ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Enviar notificación
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar desactivar */}
      {confirmDeact && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" style={{ marginTop: 0 }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <ToggleLeft className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">¿Desactivar empleado?</h3>
            <p className="text-gray-500 text-sm mb-6">
              <strong>{confirmDeact.fullName}</strong> no podrá registrar asistencia mientras esté inactivo.
            </p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setConfirmDeact(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
              <button onClick={confirmDeactivate} disabled={!!togglingId} className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                {togglingId ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Desactivar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
