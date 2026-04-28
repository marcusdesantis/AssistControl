import { ImageResponse } from 'next/og'

export const runtime     = 'nodejs'
export const alt         = 'TiempoYa — Planes y Precios'
export const size        = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column',
        background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 60%, #3b82f6 100%)',
        fontFamily: 'sans-serif',
        overflow: 'hidden',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute', right: -100, top: -100,
          width: 450, height: 450, borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)', display: 'flex',
        }} />

        <div style={{
          display: 'flex', flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 88px', height: '100%',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{
              width: 56, height: 56, background: 'rgba(255,255,255,0.15)',
              borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid rgba(255,255,255,0.25)',
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <span style={{ color: 'white', fontSize: 28, fontWeight: 700 }}>TiempoYa</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 26, fontWeight: 500, display: 'flex' }}>
              Planes y Precios
            </div>
            <div style={{
              color: 'white', fontSize: 68, fontWeight: 800,
              lineHeight: 1.05, letterSpacing: -2, maxWidth: 780,
            }}>
              Simple, transparente y sin sorpresas
            </div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 28, display: 'flex' }}>
              Desde el plan gratuito hasta soluciones empresariales.
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: 100, padding: '10px 24px',
              color: 'white', fontSize: 22, fontWeight: 600, display: 'flex',
            }}>
              Comenzar gratis →
            </div>
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 20, display: 'flex' }}>
              www.tiempoya.net
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
