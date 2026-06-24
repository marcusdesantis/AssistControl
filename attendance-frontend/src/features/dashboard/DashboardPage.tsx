import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Users, UserCheck, UserX, Clock, TrendingUp, Calendar, ArrowRight, Loader2,
  AlertTriangle, CalendarDays, BarChart2, ScanLine, Settings, Lock,
} from 'lucide-react'
import { useAuthStore }      from '@/store/authStore'
import { usePlan }           from '@/hooks/usePlan'
import type { PlanCapabilities } from '@/types/auth'
import UpgradeCard          from '@/components/UpgradeCard'
import OnboardingWizard from '@/components/OnboardingWizard'
import { billingService }    from '../settings/billingService'
import type { Subscription } from '@/types/billing'
import { employeeService }   from '../employees/employeeService'
import { attendanceService } from '../attendance/attendanceService'
import { scheduleService }                      from '../schedules/scheduleService'
import { companyService }                       from '../company/companyService'
import { settingsService }                      from '../settings/settingsService'
import { departmentService, positionService }   from '../organization/organizationService'
import type { AttendanceRecord } from '@/types/attendance'
import type { Employee }         from '@/types/employee'
import clsx            from 'clsx'
import { countryToLocale } from '@/utils/locale'
import { createTour }      from '@/utils/tour'
import HelpButton          from '@/components/HelpButton'
import SetupChecklist      from '@/components/SetupChecklist'

interface DashboardStats {
  total:    number
  present:  number
  late:     number
  absent:   number
  noRecord: number
}

function toLocalDateString(d: Date): string {
  const y   = d.getFullYear()
  const m   = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatTime(iso?: string, timeZone = 'America/Guayaquil', locale = 'es-EC'): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: true, timeZone })
}

const STATUS_BADGE: Record<string, string> = {
  Present: 'bg-green-100 text-green-700',
  Late:    'bg-yellow-100 text-yellow-700',
  Absent:  'bg-red-100 text-red-700',
  HalfDay: 'bg-blue-100 text-blue-700',
}
const STATUS_LABEL: Record<string, string> = {
  Present: 'Presente',
  Late:    'Tarde',
  Absent:  'Ausente',
  HalfDay: 'Medio Día',
}

export default function DashboardPage() {
  const user     = useAuthStore((s) => s.user)
  const { can }  = usePlan()
  const timeZone = user?.timeZone ?? 'America/Guayaquil'
  const locale   = countryToLocale(user?.country ?? 'EC')

  const [stats,          setStats]          = useState<DashboardStats | null>(null)
  const [recent,         setRecent]         = useState<AttendanceRecord[]>([])
  const [loading,        setLoading]        = useState(true)

  // Checklist setup state
  const [hasLogo,        setHasLogo]        = useState(false)
  const [hasSchedules,   setHasSchedules]   = useState(false)
  const [hasCatalog,     setHasCatalog]     = useState(false)
  const [hasEmployees,   setHasEmployees]   = useState(false)
  const [hasSmtp,        setHasSmtp]        = useState(false)
  const [hasCheckerKey,  setHasCheckerKey]  = useState(false)
  const [hasAttendance,  setHasAttendance]  = useState(false)
  const [setupCelebrated, setSetupCelebrated] = useState(false)
  const [sub,            setSub]            = useState<Subscription | null | undefined>(undefined)
  const setOnboardingComplete = useAuthStore((s) => s.setOnboardingComplete)
  const showOnboarding = user !== null && user.onboardingCompleted === false

  // Empleados sin horario asignado (alerta)
  const [noScheduleCount, setNoScheduleCount] = useState(0)

  useEffect(() => {
    const today = toLocalDateString(new Date())

    billingService.getSubscription().then(setSub).catch(() => setSub(null))

    Promise.all([
      employeeService.getAll(),
      attendanceService.getByDate(today),
      scheduleService.getAll(),
      companyService.get().catch(() => null),
      settingsService.get().catch(() => null),
      departmentService.getAll().catch(() => []),
      positionService.getAll().catch(() => []),
      attendanceService.hasAny().catch(() => false),
    ]).then(([emps, recs, scheds, company, settings, depts, positions, anyRecs]) => {
      const active = emps.filter((e: Employee) => e.status === 'Active')
      const recordMap = new Map(recs.map((r: AttendanceRecord) => [r.employeeId, r]))

      const present  = recs.filter((r: AttendanceRecord) => r.status === 'Present').length
      const late     = recs.filter((r: AttendanceRecord) => r.status === 'Late').length
      const absent   = recs.filter((r: AttendanceRecord) => r.status === 'Absent').length
      const noRecord = active.filter((e: Employee) => !recordMap.has(e.id)).length

      setStats({ total: active.length, present, late, absent, noRecord })

      const sorted = [...recs]
        .filter((r: AttendanceRecord) => r.checkInTime)
        .sort((a: AttendanceRecord, b: AttendanceRecord) =>
          new Date(b.checkInTime!).getTime() - new Date(a.checkInTime!).getTime()
        )
      setRecent(sorted.slice(0, 5))

      // Checklist
      const withoutSched = active.filter((e: Employee) => !e.scheduleId)

      setHasLogo(!!company?.logoBase64)
      setHasSchedules(scheds.length > 0)
      setHasCatalog(depts.length > 0 && positions.length > 0)
      setHasEmployees(active.length > 0)
      setHasSmtp(!!(settings?.smtpEnabled))
      setHasCheckerKey(!!(settings as any)?.checkerSetupDone)
      setSetupCelebrated(!!(settings as any)?.setupCelebrated)
      setHasAttendance(anyRecs as boolean)
      setNoScheduleCount(withoutSched.length)

    }).catch(() => {
      /* silent */
    }).finally(() => setLoading(false))
  }, [])

  function runTour() {
    const steps = [
      document.getElementById('tour-dash-checklist') && { element: '#tour-dash-checklist', title: 'Primeros pasos', description: 'Guía de configuración inicial. Sigue estos pasos en orden para tener todo listo.' },
      { element: '#tour-dash-stats',  title: 'Resumen del día',  description: 'Empleados presentes, ausentes y con retardo en tiempo real.' },
      document.getElementById('tour-dash-alerts') && { element: '#tour-dash-alerts', title: 'Alertas del día', description: 'Situaciones que requieren tu atención hoy.' },
      { element: '#tour-dash-recent', title: 'Últimas entradas', description: 'Las 5 marcaciones más recientes del día.' },
      { element: '#tour-dash-links',  title: 'Accesos rápidos',  description: 'Atajos a los módulos más usados.' },
    ].filter(Boolean) as any[]
    createTour(steps).drive()
  }

  const statCards = [
    {
      label: 'Presentes hoy',
      value: stats?.present ?? '—',
      icon:  UserCheck,
      color: 'text-green-600',
      bg:    'bg-green-50',
      border:'border-green-200',
      to:    '/attendance',
    },
    {
      label: 'Sin registro',
      value: stats?.noRecord ?? '—',
      icon:  UserX,
      color: 'text-red-600',
      bg:    'bg-red-50',
      border:'border-red-200',
      to:    '/attendance',
    },
    {
      label: 'Retardos',
      value: stats?.late ?? '—',
      icon:  Clock,
      color: 'text-yellow-600',
      bg:    'bg-yellow-50',
      border:'border-yellow-200',
      to:    '/attendance',
    },
    {
      label: 'Total empleados',
      value: stats?.total ?? '—',
      icon:  Users,
      color: 'text-blue-600',
      bg:    'bg-blue-50',
      border:'border-blue-200',
      to:    '/employees',
    },
  ]

  const showAlerts = !loading && stats && (
    (stats.noRecord > 0 && stats.total > 0) ||
    noScheduleCount > 0
  )

  return (
    <>
    {showOnboarding && (
      <OnboardingWizard
        onDone={() => setOnboardingComplete()}
      />
    )}
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Bienvenido, <span className="font-medium text-primary-700">{user?.username}</span>
          </p>
          <div className="mt-1"><HelpButton onClick={runTour} /></div>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 bg-white border border-gray-200 rounded-lg px-4 py-2">
          <Calendar className="w-4 h-4" />
          {new Date().toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric', timeZone })}
        </div>
      </div>

      {/* Checklist primeros pasos */}
      {!loading && (
        <SetupChecklist
          hasLogo={hasLogo}
          hasSchedules={hasSchedules}
          hasCatalog={hasCatalog}
          hasEmployees={hasEmployees}
          hasSmtp={hasSmtp}
          hasCheckerKey={hasCheckerKey}
          hasAttendance={hasAttendance}
          setupCelebrated={setupCelebrated}
          planIsDefault={!!sub?.plan?.isDefault}
        />
      )}

      {/* Upgrade card — solo cuando el plan tiene features bloqueadas */}
      {sub !== undefined && sub?.plan?.isFree && !sub?.plan?.isDefault && (
        <UpgradeCard planName={sub.plan.name} />
      )}

      {/* Stats */}
      <div id="tour-dash-stats" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, bg, border, to }) => (
          <Link
            key={label}
            to={to}
            className={clsx(
              'bg-white rounded-xl border p-5 flex items-center gap-4 hover:shadow-md transition-shadow group',
              border
            )}
          >
            <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center shrink-0', bg)}>
              <Icon className={clsx('w-6 h-6', color)} />
            </div>
            <div>
              {loading
                ? <Loader2 className="w-5 h-5 animate-spin text-gray-300 mb-1" />
                : <p className="text-2xl font-bold text-gray-900 group-hover:text-primary-700 transition-colors">{value}</p>
              }
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Alertas del día */}
      {showAlerts && (
        <div id="tour-dash-alerts" className="space-y-2">
          {stats!.noRecord > 0 && stats!.total > 0 && (
            <Link
              to="/attendance"
              className="flex items-center justify-between gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                <p className="text-sm text-amber-800 font-medium">
                  {stats!.noRecord} empleado{stats!.noRecord !== 1 ? 's' : ''} sin registrar entrada hoy
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition-transform shrink-0" />
            </Link>
          )}
          {noScheduleCount > 0 && (
            <Link
              to="/employees"
              className="flex items-center justify-between gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <CalendarDays className="w-5 h-5 text-blue-500 shrink-0" />
                <p className="text-sm text-blue-800 font-medium">
                  {noScheduleCount} empleado{noScheduleCount !== 1 ? 's' : ''} sin horario asignado
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-blue-400 group-hover:translate-x-1 transition-transform shrink-0" />
            </Link>
          )}
        </div>
      )}

      {/* Bottom panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Últimas checadas */}
        <div id="tour-dash-recent" className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary-600" />
              <h2 className="font-semibold text-gray-900">Últimas entradas</h2>
            </div>
            <Link to="/attendance" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
              Ver todo <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
            </div>
          ) : recent.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 bg-gray-50 rounded-xl border border-dashed border-gray-200 gap-2">
              <Clock className="w-8 h-8 text-gray-300" />
              <p className="text-sm text-gray-400">Sin checadas hoy</p>
              <Link to="/attendance" className="text-xs text-primary-600 font-medium hover:underline">
                Ir a Asistencia →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recent.map(r => (
                <div key={r.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{r.employeeName}</p>
                    <p className="text-xs text-gray-400">{r.department}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono text-gray-700">{formatTime(r.checkInTime, timeZone, locale)}</p>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[r.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Accesos rápidos */}
        <div id="tour-dash-links" className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary-600" />
            <h2 className="font-semibold text-gray-900">Accesos rápidos</h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {([
              { to: '/checker',             icon: ScanLine,      label: 'Checador',     desc: 'Kiosk entrada/salida',    color: 'bg-primary-600', capability: 'checker'    },
              { to: '/attendance',          icon: UserCheck,     label: 'Asistencia',   desc: 'Registros del día',       color: 'bg-green-600',   capability: 'attendance' },
              { to: '/employees',           icon: Users,         label: 'Empleados',    desc: 'Gestionar empleados',     color: 'bg-slate-600',   capability: 'employees'  },
              { to: '/schedules',           icon: CalendarDays,  label: 'Horarios',     desc: 'Turnos y jornadas',       color: 'bg-violet-600',  capability: 'schedules'  },
              { to: '/reports',             icon: BarChart2,     label: 'Reportes',     desc: 'PDF y Excel',             color: 'bg-emerald-600', capability: 'reports'    },
              { to: '/settings?tab=email',  icon: Settings,      label: 'Configuración',desc: 'SMTP · Checador · Planes',color: 'bg-gray-600',    capability: 'settings'   },
            ] as { to: string; icon: React.ElementType; label: string; desc: string; color: string; capability: keyof PlanCapabilities }[]).map(({ to, icon: Icon, label, desc, color, capability }) => {
              const locked = !can(capability)
              if (locked) {
                return (
                  <Link
                    key={to}
                    to="/settings?tab=subscription"
                    title="Disponible en plan superior"
                    className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50/60 hover:border-gray-200 transition-all group opacity-60"
                  >
                    <div className={`w-8 h-8 ${color} rounded-lg flex items-center justify-center shrink-0 opacity-50`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-500 truncate">{label}</p>
                      <p className="text-xs text-gray-400 truncate">{desc}</p>
                    </div>
                    <Lock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  </Link>
                )
              }
              return (
                <Link
                  key={to}
                  to={to}
                  className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all group"
                >
                  <div className={`w-8 h-8 ${color} rounded-lg flex items-center justify-center shrink-0`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 group-hover:text-primary-700 transition-colors">{label}</p>
                    <p className="text-xs text-gray-400 truncate">{desc}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </div>
    </>
  )
}
