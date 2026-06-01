import { withAdmin, apiOk, sendSystemEmail, prisma, createLog, getClientIp } from '@attendance/shared'

export const POST = withAdmin(async (req, { admin, tenantId }) => {
  const user = await prisma.user.findUnique({ where: { id: admin.sub }, select: { email: true } })
  const email = user?.email ?? '—'

  // Marcar tenant como pendiente de eliminación
  await prisma.tenant.update({
    where: { id: tenantId },
    data:  { deletionRequestedAt: new Date() },
  })

  // Revocar TODOS los refresh tokens del tenant (fuerza logout de admins)
  await prisma.refreshToken.updateMany({
    where: { user: { tenantId } },
    data:  { isRevoked: true },
  })

  sendSystemEmail({
    subject: `🗑️ Solicitud de eliminación de cuenta — ${admin.username}`,
    html: `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:20px 12px;">
  <div style="background:#fff;border-radius:12px;overflow:hidden;border:1px solid #fecaca;">
    <div style="background:linear-gradient(135deg,#dc2626 0%,#b91c1c 100%);padding:24px 20px;">
      <p style="margin:0;font-size:11px;color:#fecaca;font-weight:600;letter-spacing:1px;text-transform:uppercase;">TiempoYa · Sistema</p>
      <h1 style="margin:6px 0 0;font-size:20px;color:#fff;font-weight:700;">🗑️ Solicitud de eliminación de cuenta</h1>
    </div>
    <div style="padding:20px;">
      <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.5;">Un usuario ha solicitado la eliminación de su cuenta desde la aplicación:</p>
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:4px 16px 10px;">
        <div style="padding:10px 0;"><p style="margin:0 0 3px;color:#94a3b8;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Usuario</p><p style="margin:0;color:#0f172a;font-size:15px;font-weight:700;">${admin.username}</p></div>
        <div style="padding:10px 0;border-top:1px solid #fecaca;"><p style="margin:0 0 3px;color:#94a3b8;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Email</p><p style="margin:0;color:#0f172a;font-size:14px;word-break:break-word;">${email}</p></div>
        <div style="padding:10px 0;border-top:1px solid #fecaca;"><p style="margin:0 0 3px;color:#94a3b8;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">ID empresa</p><p style="margin:0;color:#64748b;font-size:11px;font-family:monospace,monospace;word-break:break-all;">${tenantId}</p></div>
      </div>
      <p style="margin:16px 0 0;font-size:13px;color:#dc2626;font-weight:600;">Procesa esta solicitud en un plazo máximo de 30 días hábiles.</p>
    </div>
    <div style="background:#fef2f2;border-top:1px solid #fecaca;padding:14px 20px;text-align:center;">
      <p style="margin:0;font-size:11px;color:#94a3b8;">Correo automático · TiempoYa &mdash; No respondas este mensaje.</p>
    </div>
  </div>
</div></body></html>`,
  }).catch(() => {})

  createLog({
    tenantId,
    userId:   admin.sub,
    userName: admin.username,
    action:   'account.deletion_requested',
    module:   'auth',
    ip:       getClientIp(req),
  }).catch(() => {})

  return apiOk({ logout: true }, 'Solicitud de eliminación enviada. Tu sesión será cerrada.')
})
