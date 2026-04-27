import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, Building2, CreditCard, Package, ShieldCheck, ChevronRight, Settings, FileText, Users } from 'lucide-react'
import { useSysAuthStore } from '@/store/sysAuthStore'
import NotificationBell from '@/components/NotificationBell'
import SysProfileMenu from './SysProfileMenu'

const NAV = [
  { to: '/sys',              label: 'Dashboard',     icon: LayoutDashboard, end: true },
  { to: '/sys/tenants',      label: 'Empresas',      icon: Building2 },
  { to: '/sys/users',        label: 'Usuarios',      icon: Users },
  { to: '/sys/plans',        label: 'Planes',        icon: Package },
  { to: '/sys/subscriptions',label: 'Suscripciones', icon: CreditCard },
  { to: '/sys/invoices',     label: 'Comprobantes',  icon: FileText },
  { to: '/sys/settings',     label: 'Configuración', icon: Settings },
]

export default function SysLayout() {
  const { user } = useSysAuthStore()

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">

      {/* Sidebar */}
      <aside className="w-60 bg-slate-900 flex flex-col shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-700">
          <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-tight">Admin Panel</p>
            <p className="text-slate-400 text-[11px]">Sistema</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`
              }>
              {({ isActive }) => (
                <>
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1">{label}</span>
                  {isActive && <ChevronRight className="w-3 h-3 opacity-60" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User info (solo nombre) */}
        <div className="px-3 py-4 border-t border-slate-700">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold">
                {user?.name?.charAt(0).toUpperCase() ?? 'A'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">{user?.name}</p>
              <p className="text-slate-500 text-[11px] truncate">{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="bg-white border-b border-gray-200 h-14 flex items-center px-6 shrink-0 gap-3">
          <span className="text-sm text-gray-400 hidden md:block">
            {new Date().toLocaleDateString('es-EC', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
          <div className="flex-1" />
          <NotificationBell endpoint="/notifications" variant="sys" />
          <SysProfileMenu />
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 min-h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
