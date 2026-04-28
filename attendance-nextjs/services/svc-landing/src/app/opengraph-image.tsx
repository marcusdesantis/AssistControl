import { ImageResponse } from 'next/og'

export const runtime     = 'nodejs'
export const alt         = 'TiempoYa — Control de Asistencia para Empresas'
export const size        = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%',
          display: 'flex', flexDirection: 'column',
          background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 60%, #3b82f6 100%)',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Círculo decorativo fondo */}
        <div style={{
          position: 'absolute', right: -120, top: -120,
          width: 500, height: 500, borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)',
          display: 'flex',
        }} />
        <div style={{
          position: 'absolute', right: 80, bottom: -160,
          width: 380, height: 380, borderRadius: '50%',
          background: 'rgba(255,255,255,0.04)',
          display: 'flex',
        }} />

        {/* Contenido principal */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 88px',
          height: '100%',
        }}>

          {/* Logo + nombre */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{
              width: 64, height: 64,
              background: 'rgba(255,255,255,0.15)',
              borderRadius: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid rgba(255,255,255,0.25)',
            }}>
              {/* Ícono reloj */}
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <span style={{ color: 'white', fontSize: 32, fontWeight: 700, letterSpacing: -0.5 }}>
              TiempoYa
            </span>
          </div>

          {/* Headline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{
              color: 'white',
              fontSize: 72,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -2,
              maxWidth: 820,
            }}>
              Controla la asistencia de tu equipo
            </div>
            <div style={{
              color: 'rgba(255,255,255,0.75)',
              fontSize: 30,
              fontWeight: 400,
              lineHeight: 1.4,
              maxWidth: 680,
            }}>
              Software de RRHH · Registra asistencia, gestiona horarios y genera reportes automáticos.
            </div>
          </div>

          {/* Footer badges */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            {['App móvil incluida', 'Plan gratuito', 'Soporte en español'].map(tag => (
              <div key={tag} style={{
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 100,
                padding: '10px 20px',
                color: 'white',
                fontSize: 20,
                fontWeight: 500,
                display: 'flex',
              }}>
                {tag}
              </div>
            ))}
            <div style={{
              marginLeft: 'auto',
              color: 'rgba(255,255,255,0.5)',
              fontSize: 20,
              display: 'flex',
            }}>
              www.tiempoya.net
            </div>
          </div>

        </div>
      </div>
    ),
    { ...size }
  )
}
