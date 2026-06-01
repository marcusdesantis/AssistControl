import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Eliminación de cuenta — TiempoYa',
  description: 'Instrucciones para solicitar la eliminación de tu cuenta y datos en TiempoYa.',
  alternates: { canonical: '/account-deletion' },
  robots: { index: true, follow: true },
}

export const dynamic = 'force-dynamic'

const INTERNAL = process.env.INTERNAL_API_URL ?? 'http://nginx'

async function getSupportEmail(): Promise<string> {
  try {
    const res = await fetch(`${INTERNAL}/api/v1/public/contact`, { cache: 'no-store' })
    const json = await res.json()
    return json?.data?.supportEmail ?? 'soporte@tiempoya.net'
  } catch {
    return 'soporte@tiempoya.net'
  }
}

export default async function AccountDeletionPage() {
  const supportEmail = await getSupportEmail()
  return (
    <main style={{ fontFamily: 'Arial, Helvetica, sans-serif', background: '#f8fafc', minHeight: '100vh', padding: '40px 16px' }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <Link href="/" style={{ color: '#3b82f6', fontSize: 14, textDecoration: 'none' }}>
            ← Volver a TiempoYa
          </Link>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#0f172a', margin: '16px 0 8px' }}>
            Eliminación de cuenta
          </h1>
          <p style={{ color: '#64748b', fontSize: 15, margin: 0, lineHeight: 1.6 }}>
            En TiempoYa respetamos tu privacidad. Si deseas eliminar tu cuenta y los datos asociados, sigue los pasos que se describen a continuación.
          </p>
        </div>

        {/* Card */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: 24 }}>

          {/* Quién puede solicitar */}
          <div style={{ padding: '24px 28px', borderBottom: '1px solid #f1f5f9' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '0 0 12px' }}>
              ¿Quién puede solicitar la eliminación?
            </h2>
            <p style={{ margin: 0, color: '#475569', fontSize: 14, lineHeight: 1.6 }}>
              Solo los <strong>administradores de empresa</strong> pueden solicitar la eliminación de su cuenta. Al hacerlo, se elimina la empresa completa junto con todos sus datos.
            </p>
          </div>

          {/* Pasos */}
          <div style={{ padding: '24px 28px', borderBottom: '1px solid #f1f5f9' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '0 0 16px' }}>
              Pasos para solicitar la eliminación
            </h2>

            {[
              { n: '1', title: 'Abre la aplicación TiempoYa Admin', desc: 'Inicia sesión en la app móvil o en el portal web www.tiempoya.net con tu usuario y contraseña.' },
              { n: '2', title: 'Ve a Mi perfil', desc: 'En el menú lateral o en el ícono de tu avatar en la esquina superior, accede a "Mi perfil".' },
              { n: '3', title: 'Sección "Eliminar cuenta"', desc: 'Al final de la página encontrarás la sección "Eliminar cuenta". Pulsa el botón "Eliminar mi cuenta".' },
              { n: '4', title: 'Confirma la solicitud', desc: 'Aparecerá un mensaje de confirmación. Al aceptar, se enviará la solicitud y recibirás una confirmación por correo electrónico.' },
              { n: '5', title: 'Contacto directo (alternativa)', desc: `Si no puedes acceder a la app, envía un correo a ${supportEmail} con el asunto "Solicitud de eliminación de cuenta", indicando el email y nombre de empresa registrados.` },
            ].map(step => (
              <div key={step.n} style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#eff6ff', border: '2px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 700, color: '#2563eb', fontSize: 14 }}>
                  {step.n}
                </div>
                <div>
                  <p style={{ margin: '0 0 4px', fontWeight: 600, color: '#0f172a', fontSize: 14 }}>{step.title}</p>
                  <p style={{ margin: 0, color: '#64748b', fontSize: 13, lineHeight: 1.5 }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Qué datos se eliminan */}
          <div style={{ padding: '24px 28px', borderBottom: '1px solid #f1f5f9' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '0 0 12px' }}>
              ¿Qué datos se eliminan?
            </h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ textAlign: 'left', padding: '8px 12px', color: '#64748b', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>Tipo de dato</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', color: '#64748b', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>Acción</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', color: '#64748b', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>Retención</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { tipo: 'Perfil de usuario (nombre, email, contraseña)', accion: 'Eliminado', ret: 'Inmediata' },
                  { tipo: 'Registros de asistencia y marcaciones', accion: 'Eliminado', ret: 'Inmediata' },
                  { tipo: 'Datos de la empresa (empleados, horarios, departamentos, cargos)', accion: 'Eliminado', ret: 'Inmediata' },
                  { tipo: 'Tokens de notificaciones push', accion: 'Eliminado', ret: 'Inmediata' },
                ].map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 12px', color: '#334155' }}>{row.tipo}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ background: row.accion === 'Eliminado' ? '#fef2f2' : '#fefce8', color: row.accion === 'Eliminado' ? '#dc2626' : '#ca8a04', padding: '2px 8px', borderRadius: 99, fontSize: 12, fontWeight: 600 }}>
                        {row.accion}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#64748b', fontSize: 12 }}>{row.ret}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Plazo */}
          <div style={{ padding: '24px 28px', borderBottom: '1px solid #f1f5f9', background: '#fffbeb' }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#92400e', margin: '0 0 8px' }}>
              ⏱ Plazo de eliminación
            </h2>
            <p style={{ margin: 0, color: '#78350f', fontSize: 13, lineHeight: 1.6 }}>
              Las solicitudes de eliminación se procesan en un plazo máximo de <strong>30 días hábiles</strong> desde su recepción.
            </p>
          </div>

          {/* Contacto */}
          <div style={{ padding: '24px 28px' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>
              Contacto
            </h2>
            <p style={{ margin: '0 0 8px', color: '#475569', fontSize: 13, lineHeight: 1.6 }}>
              Para cualquier consulta sobre la eliminación de datos, contáctanos en:
            </p>
            <a href={`mailto:${supportEmail}`} style={{ color: '#2563eb', fontWeight: 600, fontSize: 14 }}>
              {supportEmail}
            </a>
          </div>

        </div>

        {/* Footer */}
        <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
          TiempoYa · Control de Asistencia — <Link href="/privacy" style={{ color: '#94a3b8' }}>Política de privacidad</Link>
        </p>

      </div>
    </main>
  )
}
