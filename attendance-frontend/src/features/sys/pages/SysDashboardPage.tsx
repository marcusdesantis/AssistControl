import { useEffect, useState } from 'react'
import { Building2, Users, TrendingUp, DollarSign, Loader2, ArrowUpRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { sysMetricsService, type SysMetrics } from '../sysService'
import { createTour } from '@/utils/tour'
import HelpButton from '@/components/HelpButton'

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number; sub?: string
  icon: React.ElementType; color: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function fmtMoney(n: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function SysDashboardPage() {
  const [metrics, setMetrics] = useState<SysMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    sysMetricsService.get()
      .then(setMetrics)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
      </div>
    )
  }

  if (!metrics) return null

  function runTour() {
    createTour([
      { element: '#tour-sysdash-stats',   title: 'Métricas del sistema',   description: 'Vista global de todo el sistema: total de empresas registradas, empleados en todas las empresas, MRR (ingresos mensuales recurrentes) y ARR (ingresos anuales recurrentes).' },
      { element: '#tour-sysdash-recent',  title: 'Empresas recientes',     description: 'Las últimas empresas que se registraron en el sistema. Haz clic en "Ver todas" para ir a la gestión completa de empresas.' },
    ]).drive()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-0.5">Vista global del sistema</p>
        <div className="mt-1"><HelpButton onClick={runTour} /></div>
      </div>

      {/* Stats */}
      <div id="tour-sysdash-stats" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total empresas"    value={metrics.totalTenants}   sub={`${metrics.activeTenants} activas`}    icon={Building2}    color="bg-blue-50 text-blue-600" />
        <StatCard label="Total empleados"   value={metrics.totalEmployees} sub="en todas las empresas"                 icon={Users}        color="bg-emerald-50 text-emerald-600" />
        <StatCard label="MRR"               value={fmtMoney(metrics.mrr)}  sub="ingresos mensuales recurrentes"        icon={DollarSign}   color="bg-violet-50 text-violet-600" />
        <StatCard label="ARR"               value={fmtMoney(metrics.arr)}  sub="ingresos anuales recurrentes"          icon={TrendingUp}   color="bg-amber-50 text-amber-600" />
      </div>

      {/* Empresas recientes */}
      <div id="tour-sysdash-recent" className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <p className="font-semibold text-gray-900 text-sm">Empresas recientes</p>
          <button onClick={() => navigate('/sys/tenants')}
            className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 font-medium">
            Ver todas <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="divide-y divide-gray-50">
          {metrics.recentTenants.map(t => (
            <div key={t.id} className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                  <span className="text-slate-600 text-xs font-bold">{t.name.charAt(0).toUpperCase()}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">{t.name}</p>
                  <p className="text-xs text-gray-400">{t.country} · {fmtDate(t.createdAt)}</p>
                </div>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${t.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                {t.isActive ? 'Activa' : 'Inactiva'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
