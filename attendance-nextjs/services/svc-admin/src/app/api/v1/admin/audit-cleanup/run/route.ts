import { withSuperadmin, apiOk, prisma } from '@attendance/shared'
import fs from 'fs'
import path from 'path'

const LOGS_BASE = process.env.LOGS_PATH ?? '/app/logs'

export const POST = withSuperadmin(async (req) => {
  const body = await req.json().catch(() => ({})) as { retentionDays?: number }
  const retentionDays = body.retentionDays
    ?? parseInt(process.env.AUDIT_LOG_RETENTION_DAYS ?? '7', 10)

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - retentionDays)

  const tenants = await prisma.auditLog.groupBy({
    by: ['tenantId'],
    where: { createdAt: { lt: cutoff } },
  })

  let totalProcessed = 0

  for (const { tenantId } of tenants) {
    const logs = await prisma.auditLog.findMany({
      where: { tenantId, createdAt: { lt: cutoff } },
      orderBy: { createdAt: 'asc' },
    })
    if (!logs.length) continue

    const byMonth: Record<string, typeof logs> = {}
    for (const log of logs) {
      const month = log.createdAt.toISOString().slice(0, 7)
      if (!byMonth[month]) byMonth[month] = []
      byMonth[month].push(log)
    }

    const tenantDir = path.join(LOGS_BASE, 'tenants', tenantId)
    fs.mkdirSync(tenantDir, { recursive: true })

    for (const [month, monthLogs] of Object.entries(byMonth)) {
      const filePath = path.join(tenantDir, `${month}.json`)
      let existing: typeof logs = []
      if (fs.existsSync(filePath)) {
        try { existing = JSON.parse(fs.readFileSync(filePath, 'utf-8')) } catch { existing = [] }
      }
      fs.writeFileSync(filePath, JSON.stringify([...existing, ...monthLogs], null, 2), 'utf-8')
    }

    await prisma.auditLog.deleteMany({
      where: { tenantId, createdAt: { lt: cutoff } },
    })

    totalProcessed += logs.length
  }

  return apiOk({
    tenantsProcessed: tenants.length,
    logsBackedUp: totalProcessed,
    cutoffDate: cutoff.toISOString().slice(0, 10),
    retentionDays,
  }, `Respaldo completado: ${totalProcessed} logs de ${tenants.length} empresa(s).`)
})
