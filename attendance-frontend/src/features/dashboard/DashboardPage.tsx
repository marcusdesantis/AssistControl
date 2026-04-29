import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, UserCheck, UserX, Clock, TrendingUp, Calendar, ArrowRight, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { employeeService }   from '../employees/employeeService'
import { attendanceService } from '../attendance/attendanceService'
import type { AttendanceRecord } from '@/types/attendance'
import type { Employee } from '@/types/employee'
import clsx from 'clsx'
import { countryToLocale } from '@/utils/locale'
import { createTour } from '@/utils/tour'
import HelpButton from '@/components/HelpButton'

interface DashboardStats {
  total:    number
  present:  number
  late:     number
  absent:   number
  noRecord: number
}

function toLocalDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
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
  const timeZone = user?.timeZone ?? 'America/Guayaquil'
  const locale   = countryToLocale(user?.country ?? 'EC')
  const [stats,      setStats]      = useState<DashboardStats | null>(null)
  const [recent,     setRecent]     = useState<AttendanceRecord[]>([])
  const [loading,    setLoading]    = useState(true)

  useEffect(() => {
    const today = toLocalDateString(new Date())
    Promise.all([
      employeeService.getAll(),
      attendanceService.getByDate(today),
    ]).then(([emps, recs]: [Employee[], AttendanceRecord[]]) => {
      const active = emps.filter(e => e.status === 'Active')
      const recordMap = new Map(recs.map(r => [r.employeeId, r]))
      const present  = recs.filter(r => r.status === 'Present').length
      const late     = recs.filter(r => r.status === 'Late').length
      const absent   = recs.filter(r => r.status === 'Absent').length
      const noRecord = active.filter(e => !recordMap.has(e.id)).length

      setStats({ total: active.length, present, late, absent, noRecord })

      // Últimas 5 checadas (más recientes primero)
      const sorted = [...recs]
        .filter(r => r.checkInTime)
        .sort((a, b) => new Date(b.checkInTime!).getTime() - new Date(a.checkInTime!).getTime())
      setRecent(sorted.slice(0, 5))
    }).catch(() => {
      /* silent – dashboard is non-critical */
    }).finally(() => setLoading(false))
  }, [])

  function runTour() {
    createTour([
      { element: '#tour-dash-stats',  title: 'Resumen del día',       description: 'Aquí ves de un vistazo cuántos empleados están presentes, ausentes o con retardo. Haz clic en cada tarjeta para filtrar la vista de asistencia.' },
      { element: '#tour-dash-recent', title: 'Últimas entradas',      description: 'Las últimas marcaciones de entrada del día, ordenadas de más reciente a más antigua. Haz clic en "Ver todo" para ir al módulo de asistencia.' },
      { element: '#tour-dash-links',  title: 'Accesos rápidos',       description: 'Atajos a los módulos más usados: TiempoYa y Gestión de Empleados.' },
    ]).drive()
  }

  const statCards = [
    { label: 'Presentes hoy',   value: stats?.present  ?? '—', icon: UserCheck, color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-200'  },
    { label: 'Ausentes / s/reg',value: stats != null ? (stats.absent + stats.noRecord) : '—', icon: UserX, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
    { label: 'Retardos',        value: stats?.late     ?? '—', icon: Clock,     color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' },
    { label: 'Total empleados', value: stats?.total    ?? '—', icon: Users,     color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200'   },
  ]

  return (
    <div className="space-y-6">

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

      {/* Stats */}
      <div id="tour-dash-stats" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, bg, border }) => (
          <div key={label} className={clsx('bg-white rounded-xl border p-5 flex items-center gap-4', border)}>
            <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center shrink-0', bg)}>
              <Icon className={clsx('w-6 h-6', color)} />
            </div>
            <div>
              {loading
                ? <Loader2 className="w-5 h-5 animate-spin text-gray-300 mb-1" />
                : <p className="text-2xl font-bold text-gray-900">{value}</p>
              }
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

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
            <div className="flex items-center justify-center h-32 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              <p className="text-sm text-gray-400">Sin checadas hoy</p>
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

          <div className="space-y-3">
            <Link
              to="/attendance"
              className="flex items-center justify-between p-4 rounded-xl bg-primary-50 border border-primary-100 hover:bg-primary-100 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center">
                  <UserCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-primary-900 text-sm">TiempoYa</p>
                  <p className="text-xs text-primary-600">Ver y registrar checadas de hoy</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-primary-400 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              to="/employees"
              className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gray-600 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">Gestión de Empleados</p>
                  <p className="text-xs text-gray-500">Alta, baja y modificación de empleados</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
