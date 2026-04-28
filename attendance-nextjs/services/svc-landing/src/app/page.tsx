import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'AssistControl — Sistema de Control de Asistencia para Empresas',
  description:
    'Software de control de asistencia y gestión de empleados. Registra entradas, salidas y horarios en tiempo real. App móvil incluida. Prueba gratis hoy.',
  alternates: { canonical: '/' },
}

export const dynamic = 'force-dynamic'

const APP_URL = process.env.APP_URL ?? ''

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
          <Link href="#funcionalidades" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Funcionalidades</Link>
          <Link href="#como-funciona"   className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Cómo funciona</Link>
          <Link href="/precios"         className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Precios</Link>
        </nav>
        <div className="flex items-center gap-3">
          <a href={`${APP_URL}/login`} className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors">
            Iniciar sesión
          </a>
          <a href={`${APP_URL}/sign-up`}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-lg transition-colors">
            Comenzar gratis
          </a>
        </div>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section className="relative bg-gradient-to-b from-primary-50 to-white pt-20 pb-28 px-6 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary-100/60 via-transparent to-transparent" />
      <div className="relative max-w-4xl mx-auto text-center space-y-6">
        <span className="inline-block px-3 py-1 bg-primary-100 text-primary-700 text-xs font-semibold rounded-full uppercase tracking-wide">
          Software de RRHH para empresas
        </span>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight">
          Controla la asistencia de tu equipo{' '}
          <span className="text-primary-600">en tiempo real</span>
        </h1>
        <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
          Registra entradas y salidas, gestiona horarios y genera reportes automáticos.
          App móvil incluida. Sin complicaciones, desde el primer día.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <a href={`${APP_URL}/sign-up`}
            className="px-8 py-3.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl text-base transition-colors shadow-lg shadow-primary-200">
            Comenzar gratis →
          </a>
          <Link href="/precios"
            className="px-8 py-3.5 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-xl text-base transition-colors border border-gray-200 shadow-sm">
            Ver planes y precios
          </Link>
        </div>
        <p className="text-sm text-gray-400">Sin tarjeta de crédito · Configuración en minutos</p>
      </div>
    </section>
  )
}

const FEATURES = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Control de asistencia preciso',
    description:
      'Registra entradas y salidas con hora exacta. Detecta tardanzas, ausencias y horas extra automáticamente sin intervención manual.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
    title: 'App móvil para empleados',
    description:
      'Tus empleados marcan asistencia desde su celular. Compatible con iOS y Android. Funciona con geolocalización para trabajo remoto.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Gestión de horarios y turnos',
    description:
      'Configura horarios flexibles, turnos rotativos y días libres para cada empleado o departamento. Cambios en segundos.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    title: 'Reportes automáticos',
    description:
      'Genera reportes de asistencia por empleado, departamento o período. Exporta en Excel o PDF con un solo clic.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: 'Gestión de empleados',
    description:
      'Administra toda la información de tu equipo: departamentos, cargos, documentos y más desde un solo panel centralizado.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
    title: 'Notificaciones en tiempo real',
    description:
      'Recibe alertas de tardanzas, ausencias y eventos importantes. Mantente informado sin revisar el sistema constantemente.',
  },
]

function Features() {
  return (
    <section id="funcionalidades" className="py-24 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16 space-y-3">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Todo lo que necesitas para gestionar tu equipo
          </h2>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            Una plataforma completa de RRHH diseñada para empresas que quieren dejar de perder tiempo con hojas de cálculo.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {FEATURES.map(f => (
            <article key={f.title} className="p-6 rounded-2xl border border-gray-100 hover:border-primary-100 hover:shadow-md transition-all group">
              <div className="w-12 h-12 bg-primary-50 group-hover:bg-primary-100 rounded-xl flex items-center justify-center text-primary-600 mb-4 transition-colors">
                {f.icon}
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

const STEPS = [
  {
    number: '01',
    title: 'Crea tu cuenta',
    description: 'Regístrate en minutos con tu correo. Sin tarjeta de crédito. El plan gratuito incluye todo lo esencial para empezar.',
  },
  {
    number: '02',
    title: 'Agrega tu equipo',
    description: 'Invita a tus empleados por correo o comparte el enlace de registro. Organiza por departamentos y cargos.',
  },
  {
    number: '03',
    title: 'Controla en tiempo real',
    description: 'Tus empleados marcan asistencia desde la app. Tú ves todo en el panel de control y recibes reportes automáticos.',
  },
]

function HowItWorks() {
  return (
    <section id="como-funciona" className="py-24 px-6 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16 space-y-3">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Funciona en 3 pasos simples
          </h2>
          <p className="text-lg text-gray-500">
            Configura tu empresa y empieza a controlar la asistencia hoy mismo.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          <div className="hidden md:block absolute top-8 left-1/3 right-1/3 h-0.5 bg-primary-100" />
          {STEPS.map(s => (
            <div key={s.number} className="relative text-center space-y-4">
              <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center text-white text-xl font-bold mx-auto shadow-lg shadow-primary-200">
                {s.number}
              </div>
              <h3 className="font-bold text-gray-900 text-lg">{s.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{s.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Stats() {
  return (
    <section className="py-16 px-6 bg-primary-600">
      <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
        {[
          { value: '100%',  label: 'En la nube'          },
          { value: 'iOS & Android', label: 'App móvil'  },
          { value: '24/7',  label: 'Disponible siempre'  },
          { value: 'LATAM', label: 'Soporte en español'  },
        ].map(s => (
          <div key={s.label}>
            <div className="text-3xl font-extrabold">{s.value}</div>
            <div className="text-primary-200 text-sm mt-1">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

function CTA() {
  return (
    <section className="py-24 px-6 bg-white">
      <div className="max-w-3xl mx-auto text-center space-y-6">
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
          ¿Listo para modernizar la gestión de tu equipo?
        </h2>
        <p className="text-lg text-gray-500">
          Únete a empresas que ya controlan su asistencia de forma inteligente.
          Empieza gratis, sin compromisos.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a href={`${APP_URL}/sign-up`}
            className="px-8 py-3.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl text-base transition-colors shadow-lg shadow-primary-200">
            Crear cuenta gratis →
          </a>
          <Link href="/precios"
            className="px-8 py-3.5 bg-gray-50 hover:bg-gray-100 text-gray-700 font-semibold rounded-xl text-base transition-colors border border-gray-200">
            Ver planes
          </Link>
        </div>
        <p className="text-sm text-gray-400">Sin tarjeta de crédito · Cancela cuando quieras</p>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-primary-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="font-bold text-white">AssistControl</span>
          </div>
          <nav className="flex flex-wrap gap-6 text-sm justify-center">
            <Link href="/"         className="hover:text-white transition-colors">Inicio</Link>
            <Link href="/precios"  className="hover:text-white transition-colors">Precios</Link>
            <a href={`${APP_URL}/terms`}   className="hover:text-white transition-colors">Términos</a>
            <a href={`${APP_URL}/privacy`} className="hover:text-white transition-colors">Privacidad</a>
            <a href={`${APP_URL}/login`}   className="hover:text-white transition-colors">Iniciar sesión</a>
          </nav>
          <p className="text-sm text-gray-500">© {new Date().getFullYear()} AssistControl</p>
        </div>
      </div>
    </footer>
  )
}

export default function LandingPage() {
  return (
    <>
      <NavBar />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Stats />
        <CTA />
      </main>
      <Footer />
    </>
  )
}
