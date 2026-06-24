import { useEffect, useState } from 'react'
import { Building2, Users, TrendingUp, DollarSign, Loader2, ArrowUpRight, Package, X, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { sysApi } from '@/services/sysApi'
import { sysMetricsService, type SysMetrics, type PlanDistItem } from '../sysService'
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

const PLAN_COLORS = [
  { bar: 'bg-blue-500',    light: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-100'    },
  { bar: 'bg-violet-500',  light: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-violet-100'  },
  { bar: 'bg-emerald-500', light: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100' },
  { bar: 'bg-amber-500',   light: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-100'   },
  { bar: 'bg-rose-500',    light: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-100'    },
  { bar: 'bg-cyan-500',    light: 'bg-cyan-50',    text: 'text-cyan-700',    border: 'border-cyan-100'    },
]

interface TenantItem { id: string; name: string; country: string; isActive: boolean }

function PlanTenantsModal({ plan, color, onClose, onGo }: {
  plan: PlanDistItem; color: typeof PLAN_COLORS[0]
  onClose: () => void; onGo: (id: string) => void
}) {
  const [tenants,  setTenants]  = useState<TenantItem[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    sysApi.get(`/tenants?page=1&pageSize=200&planId=${plan.planId}`)
      .then(r => setTenants(r.data.data?.items ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [plan.planId])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={`px-5 py-4 flex items-center justify-between ${color.light} border-b ${color.border}`}>
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${color.bar}`} />
            <p className={`font-semibold text-sm ${color.text}`}>{plan.name}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full bg-white/70 border ${color.border} ${color.text}`}>
              {plan.count} empresa{plan.count !== 1 ? 's' : ''}
            </span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Lista */}
        <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />Cargando…
            </div>
          ) : tenants.length === 0 ? (
            <div className="py-10 text-center text-gray-400">
              <Building2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Sin empresas en este plan</p>
            </div>
          ) : tenants.map(t => (
            <div key={t.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-slate-600 text-xs font-bold">{t.name.charAt(0).toUpperCase()}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{t.name}</p>
                  <p className="text-xs text-gray-400">{t.country}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${t.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                  {t.isActive ? 'Activa' : 'Inactiva'}
                </span>
                <button onClick={() => onGo(t.id)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
                  title="Ver empresa">
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
          <button onClick={onClose} className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 font-medium">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

function PlanDistribution({ plans, total }: { plans: PlanDistItem[]; total: number }) {
  const [selected, setSelected] = useState<{ plan: PlanDistItem; color: typeof PLAN_COLORS[0] } | null>(null)
  const navigate = useNavigate()

  if (!plans.length) return null
  return (
    <div id="tour-sysdash-plans" className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-slate-400" />
          <p className="font-semibold text-gray-900 text-sm">Empresas por plan</p>
        </div>
        <p className="text-xs text-gray-400">{total} empresa{total !== 1 ? 's' : ''} en total</p>
      </div>

      {/* Barra apilada total */}
      <div className="px-5 pt-4 pb-2">
        <div className="flex h-3 rounded-full overflow-hidden gap-px bg-gray-100">
          {plans.map((p, i) => {
            const pct = total > 0 ? (p.count / total) * 100 : 0
            const c   = PLAN_COLORS[i % PLAN_COLORS.length]
            return pct > 0 ? (
              <div
                key={p.planId}
                className={`${c.bar} transition-all`}
                style={{ width: `${pct}%` }}
                title={`${p.name}: ${p.count}`}
              />
            ) : null
          })}
        </div>
      </div>

      {/* Lista de planes */}
      <div className="px-5 pb-5 pt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {plans.map((p, i) => {
          const pct = total > 0 ? Math.round((p.count / total) * 100) : 0
          const c   = PLAN_COLORS[i % PLAN_COLORS.length]
          return (
            <button key={p.planId} onClick={() => setSelected({ plan: p, color: c })}
              className={`rounded-xl border ${c.border} ${c.light} p-4 flex flex-col gap-2 text-left hover:shadow-sm transition-all active:scale-[0.98] cursor-pointer`}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${c.bar}`} />
                  <p className={`text-sm font-semibold truncate ${c.text}`}>{p.name}</p>
                </div>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-white/70 rounded-full text-gray-500 border border-gray-200 shrink-0">
                  {p.priceLabel?.trim() ? p.priceLabel : p.isFree ? 'Gratis' : `$${p.priceMonthly}/mes`}
                </span>
              </div>
              <div className="flex items-end justify-between gap-2">
                <p className="text-2xl font-extrabold text-gray-900">{p.count}</p>
                <p className="text-xs text-gray-400 pb-0.5">empresa{p.count !== 1 ? 's' : ''} · {pct}%</p>
              </div>
              <div className="h-1.5 bg-white/60 rounded-full overflow-hidden">
                <div className={`h-full ${c.bar} rounded-full transition-all`} style={{ width: `${pct}%` }} />
              </div>
            </button>
          )
        })}
      </div>

      {selected && (
        <PlanTenantsModal
          plan={selected.plan}
          color={selected.color}
          onClose={() => setSelected(null)}
          onGo={id => { setSelected(null); navigate(`/sys/tenants/${id}`) }}
        />
      )}
    </div>
  )
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
      { element: '#tour-sysdash-plans',   title: 'Empresas por plan',      description: 'Distribución de empresas según el plan que tienen contratado. La barra superior muestra la proporción visual de cada plan.' },
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

      {/* Distribución por plan */}
      <PlanDistribution plans={metrics.planDistribution ?? []} total={metrics.totalTenants} />

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
