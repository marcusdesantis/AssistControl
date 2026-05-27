import type { Metadata } from 'next'
import Link from 'next/link'
import RedirectIfAuth from './components/RedirectIfAuth'
import WhatsAppButton from './components/WhatsAppButton'

export const metadata: Metadata = {
  title: 'TiempoYa — Reloj de Asistencia Digital para Empresas en Ecuador',
  description:
    'Software de control de asistencia para empresas en Quito, Guayaquil, Cuenca, Ambato, Manta, Loja y Machala. Sin hardware biométrico. Empieza gratis en TiempoYa.',
  alternates: {
    canonical: 'https://www.tiempoya.net/',
    languages: {
      'es-EC': 'https://www.tiempoya.net/',
      'es':    'https://www.tiempoya.net/',
    },
  },
  openGraph: {
    title:       'TiempoYa — Reloj de Asistencia Digital para Empresas en Ecuador',
    description: 'Control biométrico de asistencia para empresas en Quito, Guayaquil, Cuenca, Ambato, Manta, Loja y Machala. Sin hardware, sin instalación.',
    locale:      'es_EC',
    type:        'website',
    url:         'https://www.tiempoya.net/',
  },
}

export const dynamic = 'force-dynamic'

const APP_URL = process.env.APP_URL ?? ''

// ─── JSON-LD ──────────────────────────────────────────────────────────────────

const jsonLdSoftware = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'TiempoYa',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web, iOS, Android',
  description: 'Reloj de asistencia digital y control biométrico de asistencia para empresas en Ecuador y LATAM. Sin hardware, sin instalación.',
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.9',
    ratingCount: '500',
    bestRating: '5',
    worstRating: '1',
  },
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', description: 'Plan gratuito disponible sin tarjeta de crédito' },
  url: 'https://www.tiempoya.net',
}

const jsonLdLocalBusiness = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: 'TiempoYa',
  url: 'https://www.tiempoya.net',
  description: 'Software de reloj de asistencia digital y control biométrico para empresas en Ecuador. Sin hardware, sin instalación.',
  areaServed: [
    { '@type': 'City', name: 'Quito',         addressCountry: 'EC' },
    { '@type': 'City', name: 'Guayaquil',     addressCountry: 'EC' },
    { '@type': 'City', name: 'Cuenca',        addressCountry: 'EC' },
    { '@type': 'City', name: 'Ambato',        addressCountry: 'EC' },
    { '@type': 'City', name: 'Manta',         addressCountry: 'EC' },
    { '@type': 'City', name: 'Loja',          addressCountry: 'EC' },
    { '@type': 'City', name: 'Santo Domingo', addressCountry: 'EC' },
    { '@type': 'City', name: 'Machala',       addressCountry: 'EC' },
    { '@type': 'City', name: 'Riobamba',      addressCountry: 'EC' },
    { '@type': 'City', name: 'Ibarra',        addressCountry: 'EC' },
    { '@type': 'City', name: 'Portoviejo',    addressCountry: 'EC' },
    { '@type': 'City', name: 'Esmeraldas',    addressCountry: 'EC' },
  ],
  serviceType: 'Software de Control de Asistencia Biométrica',
  priceRange: 'Gratis - $$$',
  address: { '@type': 'PostalAddress', addressCountry: 'EC' },
}

const jsonLdOrganization = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'TiempoYa',
  url: 'https://www.tiempoya.net',
  logo: 'https://www.tiempoya.net/logo.png',
  contactPoint: { '@type': 'ContactPoint', contactType: 'customer support', availableLanguage: 'Spanish' },
  sameAs: ['https://www.linkedin.com/company/tiempoya', 'https://twitter.com/tiempoya'],
}

const jsonLdFaq = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: '¿TiempoYa funciona como reloj de asistencia digital en Ecuador?',
      acceptedAnswer: { '@type': 'Answer', text: 'Sí. TiempoYa es el reloj de asistencia digital para empresas en Quito, Guayaquil, Cuenca, Ambato, Manta, Loja, Santo Domingo, Machala, Riobamba, Ibarra, Portoviejo y Esmeraldas. Los empleados fichan desde su celular mediante geolocalización GPS o código QR, sin ningún hardware físico.' },
    },
    {
      '@type': 'Question',
      name: '¿TiempoYa reemplaza el reloj biométrico con reconocimiento facial?',
      acceptedAnswer: { '@type': 'Answer', text: 'Sí. TiempoYa reemplaza el reloj biométrico con reconocimiento facial y los sistemas de control de acceso con huella digital. No requiere instalar ningún dispositivo: el empleado marca desde su propio celular con verificación de ubicación GPS, con mayor precisión y sin costo de hardware.' },
    },
    {
      '@type': 'Question',
      name: '¿Cómo se compara TiempoYa con el control biométrico Atiempo en Ecuador?',
      acceptedAnswer: { '@type': 'Answer', text: 'A diferencia del control biométrico de Atiempo y de Biometrika, TiempoYa no requiere hardware físico, ofrece plan gratuito, app móvil para iOS y Android, geolocalización GPS y reportes automáticos de nómina. Empresas en Quito, Guayaquil, Cuenca, Ambato, Manta, Loja, Machala y Riobamba ya migraron desde relojes biométricos a TiempoYa sin costo de instalación.' },
    },
    {
      '@type': 'Question',
      name: '¿TiempoYa es un sistema de vigilancia y control biométrico para múltiples sucursales?',
      acceptedAnswer: { '@type': 'Answer', text: 'Sí. TiempoYa centraliza la vigilancia y control biométrico de asistencia de todas tus sucursales desde un solo panel en la nube. Puedes gestionar empleados en Quito, Guayaquil, Cuenca, Ambato, Manta, Loja, Santo Domingo, Machala, Riobamba, Ibarra, Portoviejo y Esmeraldas sin instalar ningún equipo en cada sede.' },
    },
    {
      '@type': 'Question',
      name: '¿Cuánto cuesta TiempoYa en Ecuador?',
      acceptedAnswer: { '@type': 'Answer', text: 'TiempoYa tiene plan gratuito para hasta 5 empleados sin tarjeta de crédito. Los planes de pago escalan según el tamaño de la empresa. Disponible para empresas de Quito, Guayaquil, Cuenca, Ambato, Manta, Loja, Machala, Santo Domingo, Riobamba, Ibarra, Portoviejo y Esmeraldas.' },
    },
  ],
}

// ─── Componentes ──────────────────────────────────────────────────────────────

function NavBar() {
  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <img src="/logo-landing-pages.png" alt="TiempoYa" className="h-8 w-auto object-contain" />
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
          Reloj de asistencia digital · Software RRHH Ecuador
        </span>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight">
          Reemplaza tu reloj biométrico con el{' '}
          <span className="text-primary-600">control de asistencia digital</span>{' '}
          más usado en Ecuador
        </h1>
        <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
          El reloj de asistencia digital para empresas en Quito, Guayaquil, Cuenca, Ambato, Manta, Loja, Santo Domingo, Machala, Riobamba, Ibarra, Portoviejo y Esmeraldas.
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
    icon: (<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>),
    title: 'Control de asistencia preciso',
    description: 'Registra entradas y salidas con hora exacta. Detecta tardanzas, ausencias y horas extra automáticamente sin intervención manual.',
  },
  {
    icon: (<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>),
    title: 'App móvil para empleados',
    description: 'Tus empleados marcan asistencia desde su celular. Compatible con iOS y Android. Funciona con geolocalización para trabajo remoto.',
  },
  {
    icon: (<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>),
    title: 'Gestión de horarios y turnos',
    description: 'Configura horarios flexibles, turnos rotativos y días libres para cada empleado o departamento. Cambios en segundos.',
  },
  {
    icon: (<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>),
    title: 'Reportes de nómina automáticos',
    description: 'Genera reportes de asistencia por empleado, departamento o período. Exporta en Excel o PDF con un solo clic.',
  },
  {
    icon: (<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>),
    title: 'Gestión de empleados',
    description: 'Administra toda la información de tu equipo: departamentos, cargos, documentos y más desde un solo panel centralizado.',
  },
  {
    icon: (<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>),
    title: 'Notificaciones en tiempo real',
    description: 'Recibe alertas de tardanzas, ausencias y eventos importantes. Mantente informado sin revisar el sistema constantemente.',
  },
]

function Features() {
  return (
    <section id="funcionalidades" className="py-24 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16 space-y-3">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Control biométrico de asistencia sin hardware — disponible en Quito, Guayaquil, Cuenca, Ambato y Manta
          </h2>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            Una plataforma completa de RRHH diseñada para empresas que quieren dejar de perder tiempo con hojas de cálculo y relojes biométricos.
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
  { number: '01', title: 'Crea tu cuenta', description: 'Regístrate en minutos con tu correo. Sin tarjeta de crédito. El plan gratuito incluye todo lo esencial para empezar.' },
  { number: '02', title: 'Agrega tu equipo', description: 'Invita a tus empleados por correo o comparte el enlace de registro. Organiza por departamentos y cargos.' },
  { number: '03', title: 'Controla en tiempo real', description: 'Tus empleados marcan asistencia desde la app. Tú ves todo en el panel de control y recibes reportes automáticos.' },
]

function HowItWorks() {
  return (
    <section id="como-funciona" className="py-24 px-6 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16 space-y-3">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Cómo funciona TiempoYa: Reloj de Asistencia Digital en 3 Pasos
          </h2>
          <p className="text-lg text-gray-500">Configura tu empresa y empieza a controlar la asistencia hoy mismo.</p>
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
          { value: '100%',        label: 'En la nube, sin hardware'    },
          { value: 'iOS & Android', label: 'App móvil incluida'        },
          { value: '24/7',        label: 'Disponible siempre'          },
          { value: '12 ciudades', label: 'Cobertura en Ecuador'        },
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

function FAQ() {
  const items = [
    { q: '¿TiempoYa funciona como reloj de asistencia digital en Ecuador?', a: 'Sí. TiempoYa es el reloj de asistencia digital para empresas en Quito, Guayaquil, Cuenca, Ambato, Manta, Loja, Santo Domingo, Machala, Riobamba, Ibarra, Portoviejo y Esmeraldas. Los empleados fichan desde su celular mediante geolocalización GPS o código QR, sin ningún hardware físico.' },
    { q: '¿TiempoYa reemplaza el reloj biométrico con reconocimiento facial?', a: 'Sí. TiempoYa reemplaza el reloj biométrico con reconocimiento facial y los sistemas de control de acceso con huella digital. No requiere instalar ningún dispositivo: el empleado marca desde su propio celular con verificación de ubicación GPS, con mayor precisión y sin costo de hardware.' },
    { q: '¿Cómo se compara TiempoYa con el control biométrico Atiempo en Ecuador?', a: 'A diferencia del control biométrico de Atiempo y de Biometrika, TiempoYa no requiere hardware físico, ofrece plan gratuito, app móvil para iOS y Android, geolocalización GPS y reportes automáticos de nómina. Empresas en Quito, Guayaquil, Cuenca, Ambato, Manta, Loja, Machala y Riobamba ya migraron desde relojes biométricos a TiempoYa sin costo de instalación.' },
    { q: '¿TiempoYa es un sistema de vigilancia y control biométrico para múltiples sucursales?', a: 'Sí. TiempoYa centraliza la vigilancia y control biométrico de asistencia de todas tus sucursales desde un solo panel en la nube. Puedes gestionar empleados en Quito, Guayaquil, Cuenca, Ambato, Manta, Loja, Santo Domingo, Machala, Riobamba, Ibarra, Portoviejo y Esmeraldas sin instalar ningún equipo en cada sede.' },
    { q: '¿Cuánto cuesta TiempoYa en Ecuador?', a: 'TiempoYa tiene plan gratuito para hasta 5 empleados sin tarjeta de crédito. Los planes de pago escalan según el tamaño de la empresa. Disponible para empresas de Quito, Guayaquil, Cuenca, Ambato, Manta, Loja, Machala, Santo Domingo, Riobamba, Ibarra, Portoviejo y Esmeraldas.' },
  ]
  return (
    <section className="py-20 px-6 bg-white">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-bold text-gray-900">Preguntas frecuentes sobre TiempoYa en Ecuador</h2>
          <p className="text-gray-500">Todo lo que necesitas saber antes de empezar.</p>
        </div>
        <div className="space-y-4">
          {items.map(item => (
            <details key={item.q} className="group bg-gray-50 rounded-xl border border-gray-200 p-5">
              <summary className="font-semibold text-gray-900 cursor-pointer list-none flex items-center justify-between gap-4">
                <h3 className="text-base">{item.q}</h3>
                <span className="text-primary-600 shrink-0 text-xl leading-none group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="mt-3 text-gray-500 text-sm leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

function CTA() {
  return (
    <section className="py-24 px-6 bg-white">
      <div className="max-w-3xl mx-auto text-center space-y-6">
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
          Empieza Gratis: Tu Reloj de Asistencia Digital en Minutos
        </h2>
        <p className="text-lg text-gray-500">
          Empresas en Quito, Guayaquil, Cuenca, Ambato, Manta, Loja y Machala ya controlan su asistencia con TiempoYa. Empieza gratis, sin compromisos.
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

function ComparisonTable() {
  const rows = [
    { label: 'Sin hardware físico',            tiempoya: true,  atiempo: false, biometrika: false },
    { label: 'App móvil iOS y Android',        tiempoya: true,  atiempo: null,  biometrika: false },
    { label: 'Geolocalización GPS',            tiempoya: true,  atiempo: null,  biometrika: false },
    { label: 'Plan gratuito disponible',        tiempoya: true,  atiempo: false, biometrika: false },
    { label: 'Reportes de nómina automáticos', tiempoya: true,  atiempo: null,  biometrika: false },
    { label: 'Configuración en minutos',        tiempoya: true,  atiempo: false, biometrika: false },
    { label: 'Soporte en español Ecuador',     tiempoya: true,  atiempo: null,  biometrika: false },
  ]
  const cell = (val: boolean | null) => {
    if (val === true)  return <span className="text-green-600 font-bold text-lg">✓</span>
    if (val === false) return <span className="text-red-500 font-bold text-lg">✗</span>
    return <span className="text-yellow-500 font-bold text-lg">~</span>
  }
  return (
    <section className="py-20 px-6 bg-white">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12 space-y-3">
          <p className="text-xs font-bold text-primary-700 uppercase tracking-widest">Comparativa en Ecuador</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            TiempoYa vs control biométrico Atiempo vs Biometrika
          </h2>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            No todos los sistemas de control biométrico de asistencia son iguales. Conoce por qué empresas en Quito, Guayaquil, Cuenca, Ambato, Manta, Loja y Machala eligen TiempoYa.
          </p>
        </div>
        <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
          <div className="grid grid-cols-4 bg-primary-800 px-6 py-4 text-sm font-semibold text-white">
            <div>Característica</div>
            <div className="text-center text-emerald-300">TiempoYa</div>
            <div className="text-center text-slate-300">Atiempo</div>
            <div className="text-center text-slate-300">Biometrika</div>
          </div>
          {rows.map((r, i) => (
            <div key={r.label} className={`grid grid-cols-4 px-6 py-3.5 items-center text-sm border-b border-gray-100 ${i % 2 === 1 ? 'bg-gray-50' : 'bg-white'}`}>
              <div className="font-medium text-gray-700">{r.label}</div>
              <div className="text-center">{cell(r.tiempoya)}</div>
              <div className="text-center">{cell(r.atiempo)}</div>
              <div className="text-center">{cell(r.biometrika)}</div>
            </div>
          ))}
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center">✓ incluido &nbsp;|&nbsp; ~ parcial o con costo adicional &nbsp;|&nbsp; ✗ no disponible</p>
          </div>
        </div>
      </div>
    </section>
  )
}

const CITIES = ['Quito','Guayaquil','Cuenca','Ambato','Manta','Loja','Santo Domingo','Machala','Riobamba','Ibarra','Portoviejo','Esmeraldas']

function CoverageEcuador() {
  return (
    <section className="py-14 px-6 bg-slate-50 border-t border-gray-100">
      <div className="max-w-4xl mx-auto text-center space-y-6">
        <p className="text-xs font-bold text-primary-700 uppercase tracking-widest">Cobertura en Ecuador</p>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Reloj de asistencia digital y control biométrico para empresas en Quito, Guayaquil, Cuenca, Ambato, Manta, Loja, Santo Domingo e Ibarra
        </h2>
        <p className="text-gray-500 max-w-2xl mx-auto">
          Empresas de Quito, Guayaquil, Cuenca, Ambato, Manta, Loja, Machala, Santo Domingo, Riobamba, Ibarra, Portoviejo y Esmeraldas ya controlan la asistencia de su personal desde la nube, sin relojes biométricos ni papeleo.
        </p>
        <div className="flex flex-wrap justify-center gap-2.5">
          {CITIES.map(city => (
            <span key={city}
              className="inline-flex items-center gap-1.5 bg-primary-50 text-primary-800 font-semibold text-sm px-4 py-2 rounded-full border border-primary-200">
              📍 {city}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center">
            <img src="/logo-landing-foter.png" alt="TiempoYa" className="h-8 w-auto object-contain" />
          </div>
          <nav className="flex flex-wrap gap-6 text-sm justify-center">
            <Link href="/"         className="hover:text-white transition-colors">Inicio</Link>
            <Link href="/precios"  className="hover:text-white transition-colors">Precios</Link>
            <a href={`${APP_URL}/terms`}   className="hover:text-white transition-colors">Términos</a>
            <a href={`${APP_URL}/privacy`} className="hover:text-white transition-colors">Privacidad</a>
            <a href={`${APP_URL}/login`}   className="hover:text-white transition-colors">Iniciar sesión</a>
          </nav>
          <p className="text-sm text-gray-500">© {new Date().getFullYear()} TiempoYa</p>
        </div>
      </div>
    </footer>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSoftware) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdLocalBusiness) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrganization) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }} />
      <RedirectIfAuth />
      <NavBar />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Stats />
        <FAQ />
        <CTA />
        <ComparisonTable />
        <CoverageEcuador />
        <section className="py-12 px-6 bg-gray-50 border-t border-gray-100">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <p className="text-sm font-semibold text-gray-400 uppercase tracking-widest">También te puede interesar</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <a href="/control-asistencia" className="p-4 bg-white rounded-xl border border-gray-200 hover:border-primary-300 hover:shadow-sm transition-all text-sm font-medium text-gray-700 hover:text-primary-600">
                Control de asistencia para equipos en campo y sucursales →
              </a>
              <a href="/asistencia-laboral" className="p-4 bg-white rounded-xl border border-gray-200 hover:border-primary-300 hover:shadow-sm transition-all text-sm font-medium text-gray-700 hover:text-primary-600">
                Automatiza el control de asistencia laboral sin Excel →
              </a>
              <a href="/huella-biometrica" className="p-4 bg-white rounded-xl border border-gray-200 hover:border-primary-300 hover:shadow-sm transition-all text-sm font-medium text-gray-700 hover:text-primary-600">
                Control de asistencia sin relojes biométricos →
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <WhatsAppButton page="home" />
    </>
  )
}
