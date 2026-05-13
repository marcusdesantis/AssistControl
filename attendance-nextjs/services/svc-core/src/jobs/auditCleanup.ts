import { prisma } from '@attendance/shared'
import fs from 'fs'
import path from 'path'

const LOGS_BASE = process.env.LOGS_PATH ?? '/app/logs'

export function startAuditCleanupJob() {
  const retentionDays = parseInt(process.env.AUDIT_LOG_RETENTION_DAYS ?? '7', 10)
  const mode = retentionDays <= 14 ? 'weekly' : 'monthly'
  console.log(`[audit-cleanup] Iniciado — modo ${mode} (retención ${retentionDays} días)`)

  function scheduleNext() {
    const now  = new Date()
    const next = new Date(now)

    if (mode === 'weekly') {
      // Próximo lunes a las 00:00
      const daysUntilMonday = (8 - now.getDay()) % 7 || 7
      next.setDate(now.getDate() + daysUntilMonday)
      next.setHours(0, 0, 0, 0)
    } else {
      // Próximo día 1 del mes siguiente a las 00:00
      next.setMonth(now.getMonth() + 1, 1)
      next.setHours(0, 0, 0, 0)
    }

    const ms = next.getTime() - now.getTime()
    const label = mode === 'weekly'
      ? `lunes ${next.toLocaleDateString('es-EC')} 00:00`
      : `1° de ${next.toLocaleDateString('es-EC', { month: 'long', year: 'numeric' })} 00:00`
    console.log(`[audit-cleanup] Próxima ejecución: ${label}`)

    setTimeout(async () => {
      await runCleanup().catch(e => console.error('[audit-cleanup] error:', e))
      scheduleNext()
    }, ms)
  }

  scheduleNext()
}

async function runCleanup() {
  console.log('[audit-cleanup] Iniciando respaldo y limpieza de logs...')

  const retentionDays = parseInt(process.env.AUDIT_LOG_RETENTION_DAYS ?? '7', 10)
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - retentionDays)
  console.log(`[audit-cleanup] Retención configurada: ${retentionDays} días`)

  // Obtener todos los tenantIds con logs vencidos
  const tenants = await prisma.auditLog.groupBy({
    by: ['tenantId'],
    where: { createdAt: { lt: cutoff } },
  })

  for (const { tenantId } of tenants) {
    await backupAndDeleteTenantLogs(tenantId, cutoff)
  }

  console.log(`[audit-cleanup] Completado. ${tenants.length} empresa(s) procesadas.`)
}

async function backupAndDeleteTenantLogs(tenantId: string, cutoff: Date) {
  const logs = await prisma.auditLog.findMany({
    where: { tenantId, createdAt: { lt: cutoff } },
    orderBy: { createdAt: 'asc' },
  })

  if (logs.length === 0) return

  // Nombre del archivo: fecha completa del día de backup (YYYY-MM-DD)
  const backupDate = new Date().toISOString().slice(0, 10) // "2026-05-13"
  const tenantDir  = path.join(LOGS_BASE, 'tenants', tenantId)
  fs.mkdirSync(tenantDir, { recursive: true })

  const filePath = path.join(tenantDir, `${backupDate}.json`)

  // Si ya existe (doble ejecución el mismo día), fusionar
  let existing: typeof logs = []
  if (fs.existsSync(filePath)) {
    try { existing = JSON.parse(fs.readFileSync(filePath, 'utf-8')) } catch { existing = [] }
  }

  fs.writeFileSync(filePath, JSON.stringify([...existing, ...logs], null, 2), 'utf-8')

  // Borrar de la DB
  await prisma.auditLog.deleteMany({
    where: { tenantId, createdAt: { lt: cutoff } },
  })

  console.log(`[audit-cleanup] Tenant ${tenantId}: ${logs.length} logs respaldados en ${backupDate}.json`)
}
