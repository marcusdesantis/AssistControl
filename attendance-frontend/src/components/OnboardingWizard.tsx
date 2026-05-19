import { useState } from 'react'
import {
  Building2, CalendarDays, Network, Users, ScanLine,
  ChevronRight, ChevronLeft, Rocket, CheckCircle2,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { authService } from '@/features/auth/authService'

interface Props {
  onDone: () => void
}

const SLIDES = [
  {
    icon:  Rocket,
    color: 'bg-primary-600',
    title: '¡Bienvenido a TiempoYa!',
    desc:  'En pocos minutos tendrás tu empresa configurada y lista para registrar asistencia. Te guiaremos paso a paso.',
    hint:  null,
    cta:   null,
  },
  {
    icon:  Building2,
    color: 'bg-teal-600',
    title: 'Perfil de tu empresa',
    desc:  'Completa los datos de tu empresa: logo, nombre legal, información fiscal y dirección. Esto aparecerá en los reportes y comprobantes.',
    hint:  '⚙️  Empresa → Datos generales',
    cta:   { label: 'Ir a Empresa', to: '/company' },
  },
  {
    icon:  Network,
    color: 'bg-violet-600',
    title: 'Departamentos y cargos',
    desc:  'Define la estructura de tu empresa creando departamentos (Ventas, Operaciones…) y los cargos de cada área. Los necesitarás al registrar empleados.',
    hint:  '⚙️  Organización → Departamentos y Cargos',
    cta:   { label: 'Ir a Organización', to: '/organization' },
  },
  {
    icon:  CalendarDays,
    color: 'bg-purple-600',
    title: 'Horarios de trabajo',
    desc:  'Crea los turnos de tu empresa: horario de entrada, salida, almuerzo y días laborales. Puedes tener múltiples horarios para diferentes equipos.',
    hint:  '⚙️  Horarios → Nuevo horario',
    cta:   { label: 'Ir a Horarios', to: '/schedules' },
  },
  {
    icon:  Users,
    color: 'bg-blue-600',
    title: 'Registra tus empleados',
    desc:  'Agrega a tu equipo asignándoles departamento, cargo y horario. Cada empleado recibe un código, usuario y PIN para marcar asistencia.',
    hint:  '⚙️  Empleados → Nuevo empleado',
    cta:   { label: 'Ir a Empleados', to: '/employees' },
  },
  {
    icon:  ScanLine,
    color: 'bg-indigo-600',
    title: 'Configura el Checador',
    desc:  'El checador es el kiosk donde tus empleados marcan entrada y salida con su código y PIN. Necesita una clave de acceso que solo tú conoces.',
    hint:  '⚙️  Configuración → Checador',
    cta:   { label: 'Ir a Configuración', to: '/settings?tab=checker' },
  },
  {
    icon:  CheckCircle2,
    color: 'bg-green-600',
    title: '¡Todo listo para comenzar!',
    desc:  'Ya tienes claro lo que necesitas. En el Dashboard encontrarás una guía de "Primeros pasos" que te irá llevando por cada configuración en el orden correcto.',
    hint:  null,
    cta:   null,
  },
]

export default function OnboardingWizard({ onDone }: Props) {
  const [step,    setStep]    = useState(0)
  const [exiting, setExiting] = useState(false)
  const navigate = useNavigate()

  const isFirst = step === 0
  const isLast  = step === SLIDES.length - 1
  const slide   = SLIDES[step]
  const Icon    = slide.icon

  const finish = () => {
    setExiting(true)
    authService.completeOnboarding().catch(() => {})
    setTimeout(onDone, 350)
  }

  // Navega al módulo sin marcar el onboarding como completo
  // Al volver al dashboard el wizard aparece de nuevo para continuar
  const goTo = (to: string) => {
    navigate(to)
  }

  return (
    <div className={`fixed inset-0 z-[9000] flex items-center justify-center p-4 transition-opacity duration-300 ${exiting ? 'opacity-0' : 'opacity-100'}`}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-primary-900/80 backdrop-blur-sm" />

      {/* Card */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">

        {/* Barra de progreso superior */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-primary-500 transition-all duration-500"
            style={{ width: `${((step + 1) / SLIDES.length) * 100}%` }}
          />
        </div>

        {/* Contenido */}
        <div className="px-8 pt-10 pb-6 flex flex-col items-center text-center gap-5">

          {/* Ícono */}
          <div className={`w-16 h-16 ${slide.color} rounded-2xl flex items-center justify-center shadow-lg`}>
            <Icon className="w-8 h-8 text-white" />
          </div>

          {/* Paso */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
              Paso {step + 1} de {SLIDES.length}
            </p>
            <h2 className="text-xl font-bold text-gray-900">{slide.title}</h2>
            <p className="text-sm text-gray-500 leading-relaxed">{slide.desc}</p>
          </div>

          {/* Hint de navegación */}
          {slide.hint && (
            <div className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
              <p className="text-xs text-gray-500 font-medium">{slide.hint}</p>
            </div>
          )}
        </div>

        {/* Puntos de progreso */}
        <div className="flex justify-center gap-1.5 pb-4">
          {SLIDES.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? 'w-6 bg-primary-600' : i < step ? 'w-1.5 bg-primary-300' : 'w-1.5 bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* Botones */}
        <div className="px-8 pb-8 flex flex-col gap-2">
          {isLast ? (
            <button
              onClick={finish}
              className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              ¡Comenzar configuración!
            </button>
          ) : (
            <button
              onClick={() => setStep(s => s + 1)}
              className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
            >
              Siguiente <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {/* Ir directo al módulo (slides intermedios) */}
          {slide.cta && !isLast && (
            <button
              onClick={() => goTo(slide.cta!.to)}
              className="w-full py-2.5 text-primary-600 hover:text-primary-800 text-sm font-semibold transition-colors"
            >
              {slide.cta.label} →
            </button>
          )}

          {/* Botón atrás */}
          {!isFirst && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="w-full py-2 text-gray-400 hover:text-gray-600 text-xs font-medium transition-colors flex items-center justify-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Anterior
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

