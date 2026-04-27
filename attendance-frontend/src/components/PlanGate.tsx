import { useNavigate } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { usePlan } from '@/hooks/usePlan'
import type { PlanCapabilities } from '@/types/auth'

const CAP_NAMES: Record<keyof PlanCapabilities, string> = {
  employees:    'Gestión de Empleados',
  attendance:   'Asistencia',
  checker:      'Reloj Checador',
  mobileApp:    'App Móvil',
  schedules:    'Horarios',
  organization: 'Organización',
  messages:     'Mensajes',
  reports:      'Reportes',
  settings:     'Configuración',
}

interface Props {
  capability: keyof PlanCapabilities
  children: React.ReactNode
}

export default function PlanGate({ capability, children }: Props) {
  const { can } = usePlan()
  const navigate = useNavigate()

  if (can(capability)) return <>{children}</>

  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-5">
        <Lock className="w-7 h-7 text-gray-400" />
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">
        Función no disponible en tu plan
      </h2>
      <p className="text-gray-500 text-sm max-w-sm mb-6">
        El módulo de <span className="font-medium text-gray-700">{CAP_NAMES[capability]}</span> no
        está incluido en tu plan actual. Mejora tu suscripción para desbloquearlo.
      </p>
      <button
        onClick={() => navigate('/settings?tab=subscription')}
        className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl transition-colors">
        Ver planes disponibles
      </button>
    </div>
  )
}
