import type { Metadata } from 'next'
import Link from 'next/link'
import RedirectIfAuth from '../components/RedirectIfAuth'

export const metadata: Metadata = {
  title: 'Precios y Planes',
  description:
    'Conoce los planes de AssistControl. Desde el plan gratuito hasta soluciones empresariales. Precio justo, sin sorpresas.',
  alternates: { canonical: '/precios' },
}

export const dynamic = 'force-dynamic'

const APP_URL    = process.env.APP_URL ?? ''
const INTERNAL   = process.env.INTERNAL_API_URL   ?? 'http://nginx'

interface Plan {
  id:           string
  name:         string
  description:  string | null
  priceMonthly: number
  priceAnnual:  number | null
  maxEmployees: number | null
  features:     string[]
  isFree:       boolean
  isDefault:    boolean
}

async function getPlans(): Promise<Plan[]> {
  try {
    const res = await fetch(`${INTERNAL}/api/v1/public/plans`, { cache: 'no-store' })
    if (!res.ok) return []
    const json = await res.json()
    return json.data ?? []
  } catch {
    return []
  }
}

const CHECK = (
  <svg className="w-5 h-5 text-primary-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
)

const FEATURES_PER_PLAN = [
  'Control de asistencia en tiempo real',
  'App móvil para empleados (iOS y Android)',
  'Gestión de horarios y turnos',
  'Reportes automáticos (Excel / PDF)',
  'Gestión de departamentos y cargos',
  'Notificaciones de tardanzas y ausencias',
  'Panel de administración centralizado',
  'Soporte por correo',
]

const EXTRA_FEATURES = [
  'Soporte preferencial por ticket',
  'Mensajería interna entre empleados',
  'Reportes avanzados y analítica',
]

function NavBar() {
  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="font-bold text-gray-900 text-lg">AssistControl</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8">
          <Link href="/#funcionalidades" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Funcionalidades</Link>
          <Link href="/#como-funciona"   className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Cómo funciona</Link>
          <Link href="/precios"          className="text-sm font-semibold text-primary-600">Precios</Link>
        </nav>
        <div className="flex items-center gap-3">
          <a href={`${APP_URL}/login`} className="text-sm text-gray-600 hover:text-gray-900 font-medium">Iniciar sesión</a>
          <a href={`${APP_URL}/sign-up`}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-lg transition-colors">
            Comenzar gratis
          </a>
        </div>
      </div>
    </header>
  )
}

export default async function PreciosPage() {
  const plans = await getPlans()

  return (
    <>
      <RedirectIfAuth />
      <NavBar />
      <main>
        {/* Hero */}
        <section className="bg-gradient-to-b from-primary-50 to-white pt-16 pb-20 px-6 text-center">
          <div className="max-w-3xl mx-auto space-y-4">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900">
              Planes simples y transparentes
            </h1>
            <p className="text-lg text-gray-500">
              Sin costos ocultos. Elige el plan que se adapta al tamaño de tu empresa.
            </p>
          </div>
        </section>

        {/* Plans */}
        <section className="py-16 px-6">
          <div className="max-w-6xl mx-auto">
            {plans.length === 0 ? (
              /* Fallback si la API no responde */
              <div className="text-center py-12 space-y-4">
                <p className="text-gray-500">Cargando planes...</p>
                <a href={`${APP_URL}/sign-up`}
                  className="inline-block px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-colors">
                  Comenzar gratis
                </a>
              </div>
            ) : (
              <div className={`grid grid-cols-1 gap-8 ${plans.length === 2 ? 'md:grid-cols-2 max-w-3xl mx-auto' : plans.length >= 3 ? 'md:grid-cols-3' : ''}`}>
                {plans.map((plan, i) => {
                  const isPopular = i === Math.floor(plans.length / 2) && plans.length > 1

                  return (
                    <article
                      key={plan.id}
                      className={`relative rounded-2xl border p-8 flex flex-col gap-6 ${
                        isPopular
                          ? 'border-primary-500 shadow-xl shadow-primary-100 bg-white ring-2 ring-primary-500'
                          : 'border-gray-200 bg-white shadow-sm'
                      }`}
                    >
                      {isPopular && (
                        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                          <span className="bg-primary-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                            MÁS POPULAR
                          </span>
                        </div>
                      )}

                      <div>
                        <h2 className="text-xl font-bold text-gray-900">{plan.name}</h2>
                        {plan.description && (
                          <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
                        )}
                      </div>

                      <div className="flex items-end gap-1">
                        {plan.isFree ? (
                          <span className="text-4xl font-extrabold text-gray-900">Gratis</span>
                        ) : (
                          <>
                            <span className="text-lg font-semibold text-gray-500 mb-1">$</span>
                            <span className="text-4xl font-extrabold text-gray-900">{plan.priceMonthly}</span>
                            <span className="text-gray-400 mb-1">/mes</span>
                          </>
                        )}
                      </div>

                      {plan.maxEmployees != null && (
                        <div className="text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                          Hasta <span className="font-semibold text-gray-800">{plan.maxEmployees} empleados</span>
                        </div>
                      )}

                      <ul className="space-y-3 flex-1">
                        {plan.features.length > 0
                          ? plan.features.map((f: string) => (
                              <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                                {CHECK} {f}
                              </li>
                            ))
                          : FEATURES_PER_PLAN.map(f => (
                              <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                                {CHECK} {f}
                              </li>
                            ))
                        }
                        {!plan.isFree && plan.features.length === 0 && EXTRA_FEATURES.map(f => (
                          <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                            {CHECK} {f}
                          </li>
                        ))}
                      </ul>

                      <a
                        href={`${APP_URL}/sign-up`}
                        className={`block text-center py-3 rounded-xl font-semibold text-sm transition-colors ${
                          isPopular
                            ? 'bg-primary-600 hover:bg-primary-700 text-white shadow-lg shadow-primary-200'
                            : 'bg-gray-50 hover:bg-gray-100 text-gray-800 border border-gray-200'
                        }`}
                      >
                        {plan.isFree ? 'Comenzar gratis' : 'Elegir este plan'}
                      </a>
                    </article>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 px-6 bg-gray-50">
          <div className="max-w-3xl mx-auto space-y-8">
            <h2 className="text-2xl font-bold text-gray-900 text-center">Preguntas frecuentes</h2>
            {[
              { q: '¿Puedo cambiar de plan en cualquier momento?', a: 'Sí. Puedes actualizar o cambiar tu plan desde el panel de configuración en cualquier momento.' },
              { q: '¿Necesito tarjeta de crédito para el plan gratuito?', a: 'No. El plan gratuito no requiere tarjeta de crédito ni compromiso alguno.' },
              { q: '¿Qué pasa si supero el límite de empleados?', a: 'Te notificamos y puedes actualizar tu plan fácilmente desde el panel de administración.' },
              { q: '¿Los datos están seguros?', a: 'Sí. Toda la información está cifrada y alojada en servidores seguros. Nunca compartimos tus datos.' },
            ].map(item => (
              <div key={item.q} className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-2">{item.q}</h3>
                <p className="text-gray-500 text-sm">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-6 bg-primary-600 text-center">
          <div className="max-w-2xl mx-auto space-y-5">
            <h2 className="text-3xl font-bold text-white">Empieza hoy, sin riesgos</h2>
            <p className="text-primary-100">Plan gratuito disponible. Sin tarjeta de crédito. Cancela cuando quieras.</p>
            <a href={`${APP_URL}/sign-up`}
              className="inline-block px-8 py-3.5 bg-white hover:bg-gray-50 text-primary-700 font-bold rounded-xl transition-colors shadow-lg">
              Crear cuenta gratis →
            </a>
          </div>
        </section>
      </main>

      <footer className="bg-gray-900 text-gray-400 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-2 font-bold text-white">
            <div className="w-7 h-7 bg-primary-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            AssistControl
          </Link>
          <nav className="flex gap-6 text-sm">
            <Link href="/"        className="hover:text-white transition-colors">Inicio</Link>
            <Link href="/precios" className="hover:text-white transition-colors">Precios</Link>
            <a href={`${APP_URL}/terms`}   className="hover:text-white transition-colors">Términos</a>
            <a href={`${APP_URL}/privacy`} className="hover:text-white transition-colors">Privacidad</a>
          </nav>
          <p className="text-sm text-gray-500">© {new Date().getFullYear()} AssistControl</p>
        </div>
      </footer>
    </>
  )
}
