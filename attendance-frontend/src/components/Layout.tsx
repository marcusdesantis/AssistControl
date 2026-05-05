import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Clock, LayoutDashboard, Users, CalendarCheck,
  BarChart3, Settings, Menu, X, ChevronRight,
  ScanLine, CalendarDays, MessageSquare, Building2, Network, Lock, ShieldOff,
  AlertTriangle, Headset,
} from 'lucide-react'
import NotificationBell from './NotificationBell'
import ProfileMenu from './ProfileMenu'
import { useAuthStore } from '@/store/authStore'
import { billingService } from '@/features/settings/billingService'
import type { PlanCapabilities } from '@/types/auth'
import { DEFAULT_CAPABILITIES } from '@/types/auth'
import type { Subscription } from '@/types/billing'
import clsx from 'clsx'
import { countryToLocale } from '@/utils/locale'

interface NavItem {
  to:         string
  icon:       React.ElementType
  label:      string
  capability?: keyof PlanCapabilities
}

const navItems: NavItem[] = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard'                                    },
  { to: '/company',      icon: Building2,        label: 'Empresa'                                      },
  { to: '/employees',    icon: Users,            label: 'Empleados',    capability: 'employees'    },
  { to: '/attendance',   icon: CalendarCheck,    label: 'Asistencia',   capability: 'attendance'   },
  { to: '/schedules',    icon: CalendarDays,     label: 'Horarios',     capability: 'schedules'    },
  { to: '/organization', icon: Network,          label: 'Catálogos',    capability: 'organization' },
  { to: '/messages',     icon: MessageSquare,    label: 'Mensajes',     capability: 'messages'     },
  { to: '/reports',      icon: BarChart3,        label: 'Reportes',     capability: 'reports'      },
  { to: '/support',      icon: Headset,          label: 'Soporte'                                   },
  { to: '/settings',     icon: Settings,         label: 'Configuración y planes',capability: 'settings'     },
]

export default function Layout() {
  const navigate = useNavigate()
  const { user, clearAuth, capabilities, tenantDeactivated, clearDeactivated } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sub, setSub] = useState<Subscription | null>(null)

  const handleDeactivatedClose = () => {
    clearDeactivated()
    clearAuth()
    navigate('/login')
  }


  const can = (cap: keyof PlanCapabilities) => capabilities[cap]?.enabled === true

  useEffect(() => {
    const refresh = () => {
      billingService.getSubscription()
        .then(s => {
          if (s?.plan) {
            const caps = (s.plan.capabilities ?? DEFAULT_CAPABILITIES) as PlanCapabilities
            useAuthStore.getState().setCapabilities(caps)
          }
          if (s?.wasAutoDowngraded) {
            navigate('/dashboard')
          }
          setSub(s)
        })
        .catch(() => {})
    }
    refresh()
    const interval = setInterval(refresh, 30_000)
    window.addEventListener('focus', refresh)
    window.addEventListener('capabilities-changed', refresh)
    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', refresh)
      window.removeEventListener('capabilities-changed', refresh)
    }
  }, [])

  const roleLabel: Record<string, string> = {
    Admin: 'Administrador',
    Supervisor: 'Supervisor',
    Employee: 'Empleado',
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* Modal: cuenta desactivada */}
      {tenantDeactivated && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="h-1.5 w-full bg-red-500" />
            <div className="px-6 pt-6 pb-7 text-center">
              <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldOff className="w-7 h-7 text-red-500" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-2">Cuenta desactivada</h2>
              <p className="text-sm text-gray-500 leading-relaxed mb-6">
                Tu cuenta ha sido desactivada por el administrador del sistema. Si crees que esto es un error, por favor comunícate con soporte.
              </p>
              <button onClick={handleDeactivatedClose}
                className="w-full py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition-colors">
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay móvil */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={clsx(
        'fixed top-0 left-0 h-full w-64 bg-primary-900 text-white z-30 flex flex-col transition-transform duration-300',
        'lg:relative lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-primary-700">
          <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm leading-tight truncate">TiempoYa</p>
            <p className="text-primary-300 text-xs truncate">v1.0</p>
          </div>
          <button className="lg:hidden ml-auto" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5 text-primary-300" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label, capability }) => {
            const locked = !!capability && !can(capability)

            if (locked) {
              return (
                <button
                  key={to}
                  onClick={() => navigate('/settings?tab=subscription')}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-primary-400 hover:bg-primary-800/50 hover:text-primary-300 group"
                  title={`Disponible en plan superior`}
                >
                  <Icon className="w-5 h-5 shrink-0 opacity-50" />
                  <span className="flex-1 text-left">{label}</span>
                  <Lock className="w-3.5 h-3.5 opacity-60 shrink-0" />
                </button>
              )
            }

            return (
              <NavLink
                key={to}
                to={to}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) => clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group',
                  isActive
                    ? 'bg-primary-700 text-white'
                    : 'text-primary-200 hover:bg-primary-800 hover:text-white'
                )}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="flex-1">{label}</span>
                <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-50 transition-opacity" />
              </NavLink>
            )
          })}
        </nav>

        {/* User info */}
        <div className="border-t border-primary-700 p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 bg-primary-600 rounded-full flex items-center justify-center text-sm font-bold shrink-0">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{user?.username}</p>
              <p className="text-primary-300 text-xs truncate">{roleLabel[user?.role ?? ''] ?? user?.role}</p>
            </div>
          </div>
          <a href="/checker" target="_blank" rel="noopener noreferrer"
            className="w-full flex items-center gap-2 px-3 py-2 text-primary-200 hover:text-white hover:bg-primary-800 rounded-lg text-sm transition-colors">
            <ScanLine className="w-4 h-4" />
            Reloj Checador
          </a>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="bg-white border-b border-gray-200 h-14 flex items-center px-6 shrink-0 gap-3">
          <button className="lg:hidden p-2 rounded-lg hover:bg-gray-100" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <span className="text-sm text-gray-400 hidden md:block">
            {new Date().toLocaleDateString(
              countryToLocale(user?.country ?? 'EC'),
              { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: user?.timeZone ?? 'America/Guayaquil' }
            )}
          </span>
          <div className="flex-1" />
          <NotificationBell />
          <ProfileMenu />
        </header>

        {/* Banner de suscripción */}
        {sub && !sub.plan?.isFree && (() => {
          const days = sub.daysUntilExpiry
          const isRed = sub.inGracePeriod || (days !== null && days <= 0)
          const isYellow = !isRed && days !== null && days <= 7

          if (!isRed && !isYellow) return null

          const msg = sub.inGracePeriod
            ? `Tu suscripción venció. Tienes ${sub.graceLeft ?? 0} día${sub.graceLeft !== 1 ? 's' : ''} de gracia restantes.`
            : days === 0
            ? 'Tu suscripción vence hoy.'
            : `Tu suscripción vence en ${days} día${days !== 1 ? 's' : ''}.`

          return (
            <div className={clsx(
              'flex items-center gap-3 px-6 py-2.5 text-sm font-medium shrink-0',
              isRed ? 'bg-red-600 text-white' : 'bg-amber-400 text-amber-900'
            )}>
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span className="flex-1">{msg}</span>
              <button
                onClick={() => navigate('/settings?tab=subscription')}
                className={clsx(
                  'px-3 py-1 rounded-lg text-xs font-semibold transition-colors shrink-0',
                  isRed
                    ? 'bg-white text-red-600 hover:bg-red-50'
                    : 'bg-amber-900/20 text-amber-900 hover:bg-amber-900/30'
                )}
              >
                Renovar ahora
              </button>
            </div>
          )
        })()}

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
