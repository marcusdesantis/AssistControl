import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Settings, ChevronDown } from 'lucide-react'
import { useSysAuthStore } from '@/store/sysAuthStore'

export default function SysProfileMenu() {
  const [open, setOpen] = useState(false)
  const ref  = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { user, clearAuth } = useSysAuthStore()

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = () => {
    clearAuth()
    navigate('/sys/login', { replace: true })
  }

  const initials = user?.name?.slice(0, 2).toUpperCase() ?? 'SA'

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
        <div className="w-7 h-7 bg-slate-700 rounded-full flex items-center justify-center shrink-0">
          <span className="text-white text-xs font-bold">{initials}</span>
        </div>
        <div className="text-left hidden sm:block">
          <p className="text-xs font-semibold text-gray-800 leading-tight">{user?.name}</p>
          <p className="text-[11px] text-gray-400 leading-tight">Superadmin</p>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
            <p className="text-xs text-gray-400">{user?.email}</p>
          </div>
          <div className="py-1">
            <button onClick={() => { setOpen(false); navigate('/sys/settings') }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
              <Settings className="w-4 h-4 text-gray-400" /> Configuración
            </button>
            <button onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
              <LogOut className="w-4 h-4" /> Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
