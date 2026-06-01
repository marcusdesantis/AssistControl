import { prisma, sendSystemEmail } from '@attendance/shared'
import fs from 'fs'
import path from 'path'

const INTERVAL_MS    = 60 * 60 * 1000
const DELETION_HOURS = 72
const LOGS_BASE      = process.env.LOGS_PATH ?? '/app/logs'

async function deleteTenantCascade(id: string, name: string) {
  // Preservar nombre en los logs antes de borrar el tenant
  await prisma.auditLog.updateMany({
    where: { tenantId: id },
    data:  { tenantName: name },
  })

  const userIds = (await prisma.user.findMany({ where: { tenantId: id }, select: { id: true } })).map(u => u.id)
  if (userIds.length) await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } })

  await prisma.attendanceRecord.deleteMany({ where: { tenantId: id } })
  await prisma.employeeMessage.deleteMany({ where: { tenantId: id } })
  await prisma.checkerOtp.deleteMany({ where: { tenantId: id } })
  await prisma.employeeInvitation.deleteMany({ where: { tenantId: id } })
  await prisma.employee.deleteMany({ where: { tenantId: id } })
  await prisma.subscriptionLog.deleteMany({ where: { tenantId: id } })
  await prisma.subscription.deleteMany({ where: { tenantId: id } })
  await prisma.invoice.deleteMany({ where: { tenantId: id } })
  await prisma.paymentMethod.deleteMany({ where: { tenantId: id } })
  await prisma.schedule.deleteMany({ where: { tenantId: id } })
  await prisma.department.deleteMany({ where: { tenantId: id } })
  await prisma.position.deleteMany({ where: { tenantId: id } })
  await prisma.user.deleteMany({ where: { tenantId: id } })
  await prisma.tenant.delete({ where: { id } })

  // Guardar metadatos para poder seguir viendo los logs desde el superadmin
  try {
    const metaDir = path.join(LOGS_BASE, 'tenants', id)
    fs.mkdirSync(metaDir, { recursive: true })
    fs.writeFileSync(
      path.join(metaDir, '_meta.json'),
      JSON.stringify({ tenantId: id, name, deletedAt: new Date().toISOString() }),
    )
  } catch { /* non-critical */ }
}

function deletionEmailHtml(
  tenants: { id: string; name: string; country: string | null; deletionRequestedAt: Date | null }[],
  deletedAt: Date
): string {
  const fmt = (dt: Date) => dt.toLocaleString('es-MX', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  const rows = tenants.map(t => `
    <div style="padding:14px 16px;border-bottom:1px solid #f1f5f9;">
      <p style="margin:0 0 2px;color:#0f172a;font-size:14px;font-weight:700;">${t.name}</p>
      <p style="margin:0 0 4px;color:#64748b;font-size:12px;">${t.country ?? ''} · Solicitud: ${t.deletionRequestedAt ? fmt(t.deletionRequestedAt) : '—'}</p>
      <p style="margin:0;color:#94a3b8;font-size:11px;font-family:monospace,monospace;word-break:break-all;">${t.id}</p>
    </div>`).join('')

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:20px 12px;">
  <div style="background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
    <div style="background:linear-gradient(135deg,#374151 0%,#111827 100%);padding:24px 20px;">
      <p style="margin:0;font-size:11px;color:#9ca3af;font-weight:600;letter-spacing:1px;text-transform:uppercase;">TiempoYa · Sistema</p>
      <h1 style="margin:6px 0 0;font-size:20px;color:#fff;font-weight:700;">🗑️ ${tenants.length === 1 ? 'Empresa eliminada' : `${tenants.length} empresas eliminadas`}</h1>
    </div>
    <div style="padding:20px;">
      <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.5;">
        ${tenants.length === 1
          ? 'La siguiente empresa ha sido eliminada permanentemente'
          : `Las siguientes <strong>${tenants.length} empresas</strong> han sido eliminadas permanentemente`
        } tras cumplirse el plazo de <strong>${DELETION_HOURS} horas</strong> desde la solicitud:
      </p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin:0 0 16px;">
        <div style="padding:10px 16px;background:#f1f5f9;border-bottom:1px solid #e2e8f0;">
          <p style="margin:0;color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Eliminadas el ${fmt(deletedAt)}</p>
        </div>
        ${rows}
      </div>
      <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.5;">
        Todos los datos asociados (empleados, registros de asistencia, suscripción e historial) han sido eliminados permanentemente.
      </p>
    </div>
    <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:14px 20px;text-align:center;">
      <p style="margin:0;font-size:11px;color:#94a3b8;">Correo automático · TiempoYa &mdash; No respondas este mensaje.</p>
    </div>
  </div>
</div></body></html>`
}

async function runDeletionJob() {
  const cutoff = new Date(Date.now() - DELETION_HOURS * 60 * 60 * 1000)

  const tenants = await prisma.tenant.findMany({
    where:  { deletionRequestedAt: { lte: cutoff }, isDeleted: false },
    select: { id: true, name: true, country: true, deletionRequestedAt: true },
  })

  if (tenants.length === 0) return

  console.log(`[tenant-deletion] ${tenants.length} empresa(s) pendiente(s) de eliminación`)

  const deletedAt = new Date()
  const deleted: typeof tenants = []

  for (const tenant of tenants) {
    try {
      await deleteTenantCascade(tenant.id, tenant.name)
      deleted.push(tenant)
      console.log(`[tenant-deletion] Empresa eliminada: ${tenant.name} (${tenant.id})`)
    } catch (e) {
      console.error(`[tenant-deletion] Error al eliminar ${tenant.id}:`, e)
    }
  }

  // Un solo email resumen con todas las empresas eliminadas
  if (deleted.length > 0) {
    sendSystemEmail({
      subject: `🗑️ ${deleted.length === 1 ? `Empresa eliminada — ${deleted[0].name}` : `${deleted.length} empresas eliminadas automáticamente`}`,
      html: deletionEmailHtml(deleted, deletedAt),
    }).catch(e => console.error('[tenant-deletion] email error:', e))
  }
}

export function startTenantDeletionJob() {
  runDeletionJob().catch(e => console.error('[tenant-deletion] error inicial:', e))

  function scheduleNext() {
    setTimeout(async () => {
      await runDeletionJob().catch(e => console.error('[tenant-deletion] error:', e))
      scheduleNext()
    }, INTERVAL_MS)
  }
  scheduleNext()
  console.log(`[tenant-deletion] Job iniciado — revisión cada hora (plazo: ${DELETION_HOURS}h)`)
}
