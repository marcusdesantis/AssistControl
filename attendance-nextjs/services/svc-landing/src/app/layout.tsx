import type { Metadata } from 'next'
import './globals.css'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.tiempoya.net'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default:  'TiempoYa — Sistema de Control de Asistencia para Empresas',
    template: '%s | TiempoYa',
  },
  description:
    'Software de control de asistencia y gestión de empleados. Registra entradas, salidas y horarios en tiempo real desde cualquier dispositivo. Prueba gratis.',
  keywords: [
    'control de asistencia',
    'software RRHH',
    'gestión de empleados',
    'registro de asistencia',
    'sistema asistencia empresas',
    'control de personal',
    'software recursos humanos Ecuador',
  ],
  authors: [{ name: 'TiempoYa' }],
  openGraph: {
    type:        'website',
    locale:      'es_EC',
    url:         SITE_URL,
    siteName:    'TiempoYa',
    title:       'TiempoYa — Control de Asistencia para Empresas',
    description: 'Software de gestión de RRHH. Registra asistencia, gestiona horarios y genera reportes automáticos.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'TiempoYa' }],
  },
  twitter: {
    card:        'summary_large_image',
    title:       'TiempoYa — Control de Asistencia para Empresas',
    description: 'Software de gestión de RRHH. Registra asistencia, gestiona horarios y genera reportes automáticos.',
    images:      ['/og-image.png'],
  },
  robots: { index: true, follow: true },
  alternates: { canonical: SITE_URL },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="antialiased text-gray-900 bg-white">{children}</body>
    </html>
  )
}
