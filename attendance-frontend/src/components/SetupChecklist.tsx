import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Circle, Lock, ChevronDown, ChevronUp, Rocket, PartyPopper } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/services/api'
import { settingsService } from '@/features/settings/settingsService'

interface Step {
  id:          string
  label:       string
  description: string
  done:        boolean
  locked:      boolean
  href:        string
  cta:         string
  optional?:   boolean
}

interface Props {
  hasLogo:          boolean
  hasSchedules:     boolean
  hasCatalog:       boolean
  hasEmployees:     boolean
  hasSmtp:          boolean
  hasCheckerKey:    boolean
  hasAttendance:    boolean
  setupCelebrated:  boolean
  planIsDefault?:   boolean
}

export default function SetupChecklist({
  hasLogo, hasSchedules, hasCatalog, hasEmployees,
  hasSmtp, hasCheckerKey, hasAttendance, setupCelebrated, planIsDefault = false,
}: Props) {
  const [collapsed,   setCollapsed]   = useState(false)
  const [celebrating, setCelebrating] = useState(false)
  const [hidden, setHidden] = useState(() => {
    const allDoneNow = hasLogo && hasSchedules && hasCatalog && hasEmployees && hasCheckerKey && hasAttendance
    return allDoneNow && setupCelebrated
  })

  const steps: Step[] = [
    {
      id:          'company',
      label:       'Completa el perfil de tu empresa',
      description: 'Agrega logo, nombre legal, datos fiscales y dirección.',
      done:        hasLogo,
      locked:      false,
      href:        '/company',
      cta:         'Ir a Empresa',
    },
    {
      id:          'schedules',
      label:       'Crea un horario de trabajo',
      description: 'Define los horarios de entrada, salida y almuerzo de tus empleados.',
      done:        hasSchedules,
      locked:      planIsDefault,
      href:        '/schedules',
      cta:         'Ir a Horarios',
    },
    {
      id:          'catalog',
      label:       'Configura el catálogo de organización',
      description: 'Crea al menos un departamento y un cargo para poder registrar empleados.',
      done:        hasCatalog,
      locked:      planIsDefault,
      href:        '/organization',
      cta:         'Ir a Organización',
    },
    {
      id:          'employees',
      label:       'Crea y asigna tus empleados',
      description: 'Registra empleados con su departamento, cargo y horario asignado.',
      done:        hasEmployees,
      locked:      planIsDefault,
      href:        '/employees',
      cta:         'Ir a Empleados',
    },
    {
      id:          'smtp',
      label:       'Configura el correo SMTP',
      description: 'Necesario para enviar invitaciones a empleados y activar el doble factor del checador.',
      done:        hasSmtp,
      locked:      planIsDefault,
      href:        '/settings?tab=email',
      cta:         'Configurar correo',
      optional:    true,
    },
    {
      id:          'checker',
      label:       'Configura el checador',
      description: 'Aquí encuentras tu clave de acceso al checador. La necesitas para iniciar el kiosk en cualquier dispositivo.',
      done:        hasCheckerKey,
      locked:      planIsDefault,
      href:        '/settings?tab=checker',
      cta:         'Configurar checador',
    },
    {
      id:          'attendance',
      label:       'Registra la primera asistencia',
      description: 'Usa el checador o registra manualmente desde Asistencia.',
      done:        hasAttendance,
      locked:      planIsDefault,
      href:        '/checker',
      cta:         'Ir al Checador',
    },
  ]

  const required = steps.filter(s => !s.optional)
  const reqDone  = required.filter(s => s.done).length
  const allDone  = !planIsDefault && required.every(s => s.done)
  const pct      = Math.round((reqDone / required.length) * 100)

  useEffect(() => {
    if (!allDone) return
    if (setupCelebrated) { setHidden(true); return }

    settingsService.markSetupCelebrated().catch(() => {})
    setCelebrating(true)
    toast.success('¡Primeros pasos completados! 🎉', {
      description: 'Tu empresa está lista para registrar asistencia.',
      duration: 5000,
    })
    api.post('/notifications', {
      title: '🎉 ¡Primeros pasos completados!',
      body:  'Tu empresa está lista para registrar asistencia. ¡Bienvenido a TiempoYa!',
      type:  'success',
    }).then(() => {
      window.dispatchEvent(new CustomEvent('notifications:refresh'))
    }).catch(() => {})

    setTimeout(() => setHidden(true), 4500)
  }, [allDone, setupCelebrated])

  const toggleCollapsed = (val: boolean) => setCollapsed(val)

  if (hidden) return null

  // Pantalla de celebración
  if (celebrating) {
    return (
      <div id="tour-dash-checklist" className="overflow-hidden rounded-xl border border-green-200 bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 shadow-sm">
        <div className="flex items-center gap-4 px-6 py-5">
          <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center shrink-0 shadow-md">
            <PartyPopper className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-base font-bold text-green-800">¡Primeros pasos completados!</p>
            <p className="text-sm text-green-600 mt-0.5">
              Tu empresa está lista para registrar asistencia. ✨
            </p>
          </div>
          <div className="flex gap-1.5 text-xl">
            {['🎉', '⭐', '✅', '🚀'].map((e, i) => (
              <span key={i}>{e}</span>
            ))}
          </div>
        </div>
        <div className="h-1 bg-green-200">
          <div className="h-full bg-green-500 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div id="tour-dash-checklist" className="bg-white border border-primary-200 rounded-xl shadow-sm overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-primary-50 border-b border-primary-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center shrink-0">
            <Rocket className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-primary-900">Primeros pasos</p>
            <p className="text-xs text-primary-600">
              {planIsDefault
                ? 'Adquiere un plan para completar y desbloquear los demás pasos'
                : `${reqDone} de ${required.length} pasos principales completados`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleCollapsed(!collapsed)}
            className="p-1.5 rounded-lg hover:bg-primary-100 text-primary-500 transition-colors"
            title={collapsed ? 'Expandir' : 'Colapsar'}
          >
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
          {/* Candado — no se puede cerrar hasta completar */}
          <div
            className="p-1.5 rounded-lg text-gray-300 cursor-not-allowed"
            title="Completa todos los pasos requeridos para cerrar"
          >
            <Lock className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="h-1.5 bg-gray-100">
        <div
          className="h-full bg-primary-500 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Pasos */}
      {!collapsed && (
        <>
          <div className="divide-y divide-gray-50">
            {steps.map((step) => (
              <div
                key={step.id}
                className={`flex items-start gap-4 px-5 py-3.5 transition-colors ${
                  step.locked ? 'opacity-40' : step.done ? 'bg-gray-50/40' : 'hover:bg-gray-50'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {step.done ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : step.locked ? (
                    <Lock className="w-5 h-5 text-gray-300" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-300" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`text-sm font-medium ${step.done ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                      {step.label}
                    </p>
                    {step.optional && !step.done && (
                      <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-medium">
                        opcional
                      </span>
                    )}
                  </div>
                  {!step.done && (
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{step.description}</p>
                  )}
                </div>

                {!step.done && !step.locked && (
                  <Link
                    to={step.href}
                    target={step.id === 'attendance' ? '_blank' : undefined}
                    rel={step.id === 'attendance' ? 'noopener noreferrer' : undefined}
                    className="shrink-0 text-xs font-semibold text-primary-600 hover:text-primary-800 whitespace-nowrap mt-0.5"
                  >
                    {step.cta} →
                  </Link>
                )}
              </div>
            ))}
          </div>

        </>
      )}
    </div>
  )
}
