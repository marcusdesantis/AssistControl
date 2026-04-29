import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, Building2, CreditCard, Package, ShieldCheck, ChevronRight, Settings, FileText, Users, Headset, Menu, X } from 'lucide-react'
import { useSysAuthStore } from '@/store/sysAuthStore'
import NotificationBell from '@/components/NotificationBell'
import SysProfileMenu from './SysProfileMenu'
import clsx from 'clsx'

const NAV = [
  { to: '/sys',               label: 'Dashboard',     icon: LayoutDashboard, end: true },
  { to: '/sys/tenants',       label: 'Empresas',      icon: Building2 },
  { to: '/sys/users',         label: 'Usuarios',      icon: Users },
  { to: '/sys/plans',         label: 'Planes',        icon: Package },
  { to: '/sys/subscriptions', label: 'Suscripciones', icon: CreditCard },
  { to: '/sys/invoices',      label: 'Comprobantes',  icon: FileText },
  { to: '/sys/support',       label: 'Soporte',       icon: Headset },
  { to: '/sys/settings',      label: 'Configuración', icon: Settings },
]

export default function SysLayout() {
  const { user } = useSysAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">

      {/* Overlay móvil */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={clsx(
        'fixed top-0 left-0 h-full w-60 bg-slate-900 z-30 flex flex-col transition-transform duration-300',
        'lg:relative lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-700">
          <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm leading-tight">Admin Panel</p>
            <p className="text-slate-400 text-[11px]">Sistema</p>
          </div>
          <button className="lg:hidden ml-auto" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
              )}>
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

        {/* User info */}
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
        <header className="bg-white border-b border-gray-200 h-14 flex items-center px-4 shrink-0 gap-3">
          <button className="lg:hidden p-2 rounded-lg hover:bg-gray-100" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <span className="text-sm text-gray-400 hidden md:block">
            {new Date().toLocaleDateString('es-EC', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
          <div className="flex-1" />
          <NotificationBell endpoint="/notifications" variant="sys" />
          <SysProfileMenu />
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 min-h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
