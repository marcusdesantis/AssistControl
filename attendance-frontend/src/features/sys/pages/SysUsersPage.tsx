import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Plus, Search, Pencil, Loader2, X, Eye, EyeOff, ExternalLink, ChevronDown, ToggleLeft, ToggleRight } from 'lucide-react'
import { sysUsersService, sysTenantsService, type SysUser, type SysTenant } from '../sysService'
import Pagination from '@/components/Pagination'
import { createTour } from '@/utils/tour'
import HelpButton from '@/components/HelpButton'

const PAGE_SIZE_OPTIONS = [10, 20, 50]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

const ROLE_LABEL: Record<string, string> = { Admin: 'Admin', Supervisor: 'Supervisor', Employee: 'Empleado' }
const ROLE_COLOR: Record<string, string> = {
  Admin:      'bg-violet-100 text-violet-700',
  Supervisor: 'bg-blue-100 text-blue-700',
  Employee:   'bg-gray-100 text-gray-600',
}

// ─── Tenant Select con búsqueda ───────────────────────────────────────────────

function TenantSearch({ value, onChange }: {
  value: { id: string; name: string } | null
  onChange: (t: { id: string; name: string } | null) => void
}) {
  const [open,    setOpen]    = useState(false)
  const [query,   setQuery]   = useState('')
  const [all,     setAll]     = useState<SysTenant[]>([])
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Cargar todas las empresas una sola vez al montar
  useEffect(() => {
    setLoading(true)
    sysTenantsService.list(1, 200)
      .then(d => setAll(d.items))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = query.trim()
    ? all.filter(t => t.name.toLowerCase().includes(query.toLowerCase()))
    : all

  const select = (t: SysTenant) => {
    onChange({ id: t.id, name: t.name })
    setOpen(false)
    setQuery('')
  }

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(null)
    setQuery('')
  }

  const toggle = () => {
    setOpen(o => !o)
    if (!open) setTimeout(() => inputRef.current?.focus(), 50)
  }

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button type="button" onClick={toggle}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-left flex items-center justify-between gap-2 focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white hover:border-gray-400 transition-colors">
        {value
          ? <span className="text-gray-900 font-medium truncate">{value.name}</span>
          : <span className="text-gray-400">Seleccionar empresa...</span>
        }
        <div className="flex items-center gap-1 shrink-0">
          {value && (
            <span onClick={clear} className="p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar empresa..."
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
            </div>
          </div>
          {/* Options */}
          <div className="max-h-48 overflow-y-auto">
            {loading
              ? <p className="px-3 py-3 text-xs text-gray-400 text-center">Cargando empresas...</p>
              : filtered.length === 0
              ? <p className="px-3 py-3 text-xs text-gray-400 text-center">Sin resultados</p>
              : filtered.map(t => (
                <button key={t.id} type="button" onClick={() => select(t)}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-slate-50 transition-colors
                    ${value?.id === t.id ? 'bg-slate-100 font-semibold' : ''}`}>
                  <span className="text-gray-800">{t.name}</span>
                  <span className="text-xs text-gray-400 shrink-0 ml-2">{t.country}</span>
                </button>
              ))
            }
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Create Modal ─────────────────────────────────────────────────────────────

function CreateModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [tenant,   setTenant]   = useState<{ id: string; name: string } | null>(null)
  const [username, setUsername] = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [role,     setRole]     = useState('Admin')
  const [showPass, setShowPass] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const submit = async () => {
    if (!tenant) { setError('Selecciona una empresa.'); return }
    if (!username.trim() || !email.trim() || !password.trim()) { setError('Completa todos los campos.'); return }
    setLoading(true); setError(null)
    try {
      await sysUsersService.create({ tenantId: tenant.id, username, email, password, role })
      onSaved()
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Error al crear usuario.')
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" style={{marginTop: 0}}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Nuevo usuario</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Empresa *</label>
            <TenantSearch value={tenant} onChange={setTenant} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Usuario *</label>
              <input value={username} onChange={e => setUsername(e.target.value)}
                placeholder="admin01" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Rol *</label>
              <select value={role} onChange={e => setRole(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500">
                <option value="Admin">Admin</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Correo *</label>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email"
              placeholder="admin@empresa.com" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Contraseña *</label>
            <div className="relative">
              <input value={password} onChange={e => setPassword(e.target.value)} type={showPass ? 'text' : 'password'}
                placeholder="••••••" className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
              <button type="button" onClick={() => setShowPass(s => !s)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">El usuario deberá cambiar su contraseña al ingresar.</p>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
          <button onClick={submit} disabled={loading}
            className="px-4 py-2 text-sm bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white rounded-lg font-medium flex items-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Crear usuario
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

function EditModal({ user, onClose, onSaved }: { user: SysUser; onClose: () => void; onSaved: () => void }) {
  const [username,  setUsername]  = useState(user.username)
  const [email,     setEmail]     = useState(user.email)
  const [role,      setRole]      = useState(user.role)
  const [isActive,  setIsActive]  = useState(user.isActive)
  const [newPass,   setNewPass]   = useState('')
  const [showPass,  setShowPass]  = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  const submit = async () => {
    setLoading(true); setError(null)
    try {
      await sysUsersService.update(user.id, {
        username,
        email,
        role,
        isActive,
        ...(newPass.trim() ? { newPassword: newPass.trim() } : {}),
      })
      onSaved()
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Error al actualizar.')
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" style={{marginTop: 0}}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Editar usuario</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Usuario</label>
              <input value={username} onChange={e => setUsername(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Rol</label>
              <select value={role} onChange={e => setRole(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500">
                <option value="Admin">Admin</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Correo</label>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Nueva contraseña (opcional)</label>
            <div className="relative">
              <input value={newPass} onChange={e => setNewPass(e.target.value)} type={showPass ? 'text' : 'password'}
                placeholder="Dejar vacío para no cambiar"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
              <button type="button" onClick={() => setShowPass(s => !s)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setIsActive(s => !s)}
              className={`relative w-10 h-5.5 rounded-full transition-colors ${isActive ? 'bg-emerald-500' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isActive ? 'translate-x-4.5' : ''}`} />
            </button>
            <span className="text-sm text-gray-700">{isActive ? 'Usuario activo' : 'Usuario inactivo'}</span>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
          <button onClick={submit} disabled={loading}
            className="px-4 py-2 text-sm bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white rounded-lg font-medium flex items-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  )
}


// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SysUsersPage() {
  const navigate = useNavigate()

  const [users,      setUsers]      = useState<SysUser[]>([])
  const [total,      setTotal]      = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page,       setPage]       = useState(1)
  const [pageSize,   setPageSize]   = useState(20)
  const [loading,    setLoading]    = useState(true)

  const [search,     setSearch]     = useState('')
  const [roleFilter, setRoleFilter] = useState('')

  const [showCreate,   setShowCreate]   = useState(false)
  const [editUser,     setEditUser]     = useState<SysUser | null>(null)
  const [togglingId,   setTogglingId]   = useState<string | null>(null)
  const [confirmDeact, setConfirmDeact] = useState<SysUser | null>(null)

  const searchTimer = useRef<ReturnType<typeof setTimeout>>()
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => setDebouncedSearch(search), 350)
  }, [search])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await sysUsersService.list(page, pageSize, debouncedSearch || undefined, undefined, roleFilter || undefined)
      setUsers(data.items)
      setTotal(data.total)
      setTotalPages(data.totalPages)
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [page, pageSize, debouncedSearch, roleFilter])

  useEffect(() => { load() }, [load])

  useEffect(() => { setPage(1) }, [debouncedSearch, roleFilter])

  const onSaved = () => { setShowCreate(false); setEditUser(null); load() }

  function runTour() {
    createTour([
      { element: '#tour-users-header',  title: 'Usuarios del sistema',   description: 'Gestiona todos los usuarios de todas las empresas registradas. Desde aquí puedes crear, editar, activar o desactivar usuarios administradores.' },
      { element: '#tour-users-new',     title: 'Nuevo usuario',          description: 'Crea un usuario administrador para cualquier empresa. Selecciona la empresa, define usuario, correo y contraseña. El usuario deberá cambiar su contraseña al primer ingreso.' },
      { element: '#tour-users-filters', title: 'Filtros de búsqueda',    description: 'Busca por nombre de usuario, correo o nombre de empresa. También puedes filtrar por rol. Los resultados se obtienen directamente del servidor.' },
      { element: '#tour-users-table',   title: 'Tabla de usuarios',      description: 'Lista de usuarios con su empresa, rol, estado y último acceso. Haz clic en el nombre de la empresa para ir a su detalle. El toggle en la columna Estado activa o desactiva el usuario inmediatamente.' },
    ]).drive()
  }

  const handleToggle = async (u: SysUser) => {
    setTogglingId(u.id)
    try { await sysUsersService.toggle(u.id, u.isActive); load() }
    catch { /* ignore */ }
    finally { setTogglingId(null) }
  }

  return (
    <div className="space-y-6">

      {confirmDeact && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-base font-semibold text-gray-900">¿Desactivar usuario?</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              El usuario <span className="font-medium text-gray-800">{confirmDeact.username}</span> perderá acceso inmediatamente y su sesión será cerrada.
            </p>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setConfirmDeact(null)}
                className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button onClick={async () => { const u = confirmDeact; setConfirmDeact(null); await handleToggle(u) }}
                className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors">
                Sí, desactivar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div id="tour-users-header" className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
          <p className="text-gray-500 text-sm mt-0.5">{loading ? 'Cargando...' : `${total} usuario${total !== 1 ? 's' : ''} registrados`}</p>
          <div className="mt-1"><HelpButton onClick={runTour} /></div>
        </div>
        <button id="tour-users-new" onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
          <Plus className="w-4 h-4" />
          Nuevo usuario
        </button>
      </div>

      {/* Filters */}
      <div id="tour-users-filters" className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por usuario, correo o empresa..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white"
          />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
          className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white">
          <option value="">Todos los roles</option>
          <option value="Admin">Admin</option>
        </select>
        {(search || roleFilter) && (
          <button onClick={() => { setSearch(''); setRoleFilter('') }}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 px-3 py-2 border border-gray-300 rounded-xl bg-white">
            <X className="w-3.5 h-3.5" /> Limpiar filtros
          </button>
        )}
      </div>

      {/* Table */}
      <div id="tour-users-table" className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Usuario', 'Correo', 'Rol', 'Empresa', 'Estado', 'Último acceso', 'Creado', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                </td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Sin resultados</p>
                </td></tr>
              ) : users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 bg-slate-200 rounded-full flex items-center justify-center shrink-0">
                        <span className="text-slate-600 text-[11px] font-bold">{u.username.charAt(0).toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{u.username}</p>
                        {u.mustChangePassword && (
                          <span className="text-[10px] text-amber-600 font-medium">Debe cambiar contraseña</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_COLOR[u.role] ?? 'bg-gray-100 text-gray-500'}`}>
                      {ROLE_LABEL[u.role] ?? u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => navigate(`/sys/tenants/${u.tenant.id}`)}
                      className="flex items-center gap-1 text-xs text-slate-700 hover:text-slate-900 font-medium hover:underline"
                    >
                      {u.tenant.name}
                      <ExternalLink className="w-3 h-3 opacity-50" />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => u.isActive ? setConfirmDeact(u) : handleToggle(u)} disabled={togglingId === u.id}
                      className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${u.isActive ? 'text-emerald-600 hover:text-emerald-800' : 'text-gray-400 hover:text-gray-700'}`}>
                      {togglingId === u.id
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : u.isActive ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                      {u.isActive ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(u.lastLoginAt)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(u.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => setEditUser(u)} title="Editar"
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-gray-500 hover:text-slate-700 transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination
          page={page}
          totalPages={totalPages}
          totalCount={total}
          pageSize={pageSize}
          onPageChange={setPage}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onPageSizeChange={size => { setPageSize(size); setPage(1) }}
        />
      </div>

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onSaved={onSaved} />}
      {editUser   && <EditModal   user={editUser}   onClose={() => setEditUser(null)}   onSaved={onSaved} />}
    </div>
  )
}
