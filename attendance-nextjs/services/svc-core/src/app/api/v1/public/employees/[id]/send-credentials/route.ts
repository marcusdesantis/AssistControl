import { withPublic, apiOk, apiNotFound, apiBadRequest } from '@attendance/shared'
import { prisma, sendEmail, generateQr } from '@attendance/shared'

export const POST = withPublic(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params

  const emp = await prisma.employee.findFirst({ where: { id, isDeleted: false } })
  if (!emp) return apiNotFound('Empleado no encontrado.')
  if (!emp.email) return apiBadRequest('El empleado no tiene correo registrado.', 'NO_EMAIL')
  if (!emp.passwordDisplay) return apiBadRequest('No hay contraseña disponible. Asigna una contraseña primero.', 'NO_PASSWORD')

  const qr = await generateQr(emp.employeeCode, 200)
  await sendEmail(emp.tenantId, {
    to:      emp.email,
    subject: 'Tus credenciales de acceso',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px">
        <h2 style="color:#1e40af">Hola ${emp.firstName} ${emp.lastName}</h2>
        <p>Aquí están tus credenciales para acceder al sistema de asistencia:</p>
        <table style="border-collapse:collapse;margin:16px 0;width:100%">
          <tr style="background:#f3f4f6"><td style="padding:10px 12px;font-weight:bold;color:#374151">Código empleado</td><td style="padding:10px 12px;font-family:monospace;font-size:15px;color:#1e40af;font-weight:bold">${emp.employeeCode}</td></tr>
          <tr><td style="padding:10px 12px;font-weight:bold;color:#374151">Usuario app</td><td style="padding:10px 12px;font-family:monospace">${emp.username}</td></tr>
          <tr style="background:#f3f4f6"><td style="padding:10px 12px;font-weight:bold;color:#374151">Contraseña app</td><td style="padding:10px 12px;font-family:monospace">${emp.passwordDisplay}</td></tr>
          ${emp.pinDisplay ? `<tr><td style="padding:10px 12px;font-weight:bold;color:#374151">PIN checador</td><td style="padding:10px 12px;font-family:monospace;font-size:18px;font-weight:bold;letter-spacing:4px">${emp.pinDisplay}</td></tr>` : ''}
        </table>
        <div style="margin:24px 0;text-align:center">
          <p style="color:#555;font-size:13px;margin-bottom:8px">Escanea este QR en el checador para registrar tu asistencia:</p>
          <img src="${qr}" alt="QR código empleado" width="200" height="200" style="border:1px solid #e5e7eb;border-radius:8px;padding:8px" />
          <p style="color:#6b7280;font-size:11px;margin-top:4px">${emp.employeeCode}</p>
        </div>
        <p style="color:#9ca3af;font-size:11px">Guarda estos datos en un lugar seguro.</p>
      </div>
    `,
  })

  return apiOk(null, 'Credenciales enviadas.')
})
