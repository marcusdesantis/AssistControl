import { useNavigate } from 'react-router-dom'
import {
  ArrowRight, Users, CalendarDays, Network, Smartphone,
  BarChart2, MessageSquare, Headset, CalendarOff, Lock, Zap,
} from 'lucide-react'
import { usePlan } from '@/hooks/usePlan'
import { REPORT_DEFINITIONS } from '@/types/report'
import type { PlanCapabilities } from '@/types/auth'

interface Props {
  planName?: string
}

// Features totalmente bloqueadas (enabled: false)
const LOCKED_META: Partial<Record<keyof PlanCapabilities, { label: string; icon: React.ElementType; desc: string }>> = {
  mobileApp:       { label: 'App Móvil',        icon: Smartphone,    desc: 'Empleados marcan asistencia desde su celular con GPS' },
  messages:        { label: 'Mensajes',          icon: MessageSquare, desc: 'Comunicados internos y notificaciones push' },
  holidays:        { label: 'Días Inhábiles',    icon: CalendarOff,   desc: 'Gestión de feriados y días no laborables' },
  prioritySupport: { label: 'Soporte Premium',   icon: Headset,       desc: 'Atención prioritaria con tiempos garantizados' },
}

export default function UpgradeCard({ planName }: Props) {
  const navigate = useNavigate()
  const { can, capabilities, limit } = usePlan()

  // Módulos completamente bloqueados
  const locked = (Object.keys(LOCKED_META) as (keyof PlanCapabilities)[]).filter(k => !can(k))

  // Límites activos en el plan actual
  const limits: { icon: React.ElementType; label: string; value: string; warn: boolean }[] = []

  const empLimit  = capabilities.employees?.limit
  const schedLimit = capabilities.schedules?.limit
  const orgLimit  = capabilities.organization?.limit
  const checkLimit = capabilities.checker?.limit

  if (empLimit)   limits.push({ icon: Users,       label: 'Empleados',    value: `Hasta ${empLimit}`,         warn: true  })
  if (schedLimit) limits.push({ icon: CalendarDays, label: 'Horarios',     value: `Hasta ${schedLimit}`,        warn: false })
  if (orgLimit)   limits.push({ icon: Network,      label: 'Deptos.',      value: `Hasta ${orgLimit}`,          warn: false })
  if (checkLimit) limits.push({ icon: BarChart2,     label: 'Registros/día', value: `Hasta ${checkLimit}`,      warn: false })

  // Reportes restringidos
  const rptAllowed = (capabilities.reports as any)?.allowed as string[] | undefined
  if (can('reports') && rptAllowed && rptAllowed.length > 0 && rptAllowed.length < REPORT_DEFINITIONS.length) {
    limits.push({
      icon: BarChart2, label: 'Reportes',
      value: `${rptAllowed.length} de ${REPORT_DEFINITIONS.length}`,
      warn: true,
    })
  } else if (!can('reports')) {
    locked.push('reports' as keyof PlanCapabilities)
  }

  if (locked.length === 0 && limits.length === 0) return null

  return (
    <div className="rounded-xl overflow-hidden border border-indigo-200 shadow-sm">

      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">
              {planName ? `${planName} · Amplía tu plan` : 'Amplía tu plan'}
            </p>
            <p className="text-xs text-indigo-200">
              Desbloquea todas las funcionalidades sin límites
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/settings?tab=subscription')}
          className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 bg-white text-indigo-700 hover:bg-indigo-50 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shadow-sm"
        >
          Ver planes <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="bg-white divide-y divide-gray-50">

        {/* Límites actuales */}
        {limits.length > 0 && (
          <div className="px-4 py-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2.5">
              Límites en tu plan actual
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {limits.map(({ icon: Icon, label, value, warn }) => (
                <div
                  key={label}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-indigo-50 border-indigo-200"
                >
                  <Icon className="w-3.5 h-3.5 shrink-0 text-indigo-500" />
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 leading-none">{label}</p>
                    <p className={`text-xs font-bold mt-0.5 ${warn ? 'text-indigo-700' : 'text-gray-700'}`}>{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Features bloqueadas */}
        {locked.length > 0 && (
          <div className="px-4 py-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2.5">
              Disponible en planes superiores
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {locked.map(key => {
                const meta = LOCKED_META[key as keyof typeof LOCKED_META]
                if (!meta) return null
                const Icon = meta.icon
                return (
                  <button
                    key={key}
                    onClick={() => navigate('/settings?tab=subscription')}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-left group border border-transparent hover:border-gray-100"
                  >
                    <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-indigo-100 transition-colors">
                      <Icon className="w-3.5 h-3.5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-semibold text-gray-700">{meta.label}</p>
                        <Lock className="w-3 h-3 text-gray-300 shrink-0" />
                      </div>
                      <p className="text-xs text-gray-400 truncate">{meta.desc}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* CTA pie */}
        <div className="bg-indigo-50 border-t border-indigo-100 px-5 py-2.5 flex items-center justify-between gap-3">
          <p className="text-xs text-indigo-800">
            Accede a todas las funcionalidades y lleva la gestión de tu equipo al siguiente nivel
          </p>
          <button
            onClick={() => navigate('/settings?tab=subscription')}
            className="shrink-0 text-xs font-bold text-indigo-600 hover:text-indigo-900 whitespace-nowrap"
          >
            Comparar planes →
          </button>
        </div>
      </div>
    </div>
  )
}
