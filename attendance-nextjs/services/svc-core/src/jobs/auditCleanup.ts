import { prisma } from '@attendance/shared'
import fs from 'fs'
import path from 'path'

const LOGS_BASE = process.env.LOGS_PATH ?? '/app/logs'

export function startAuditCleanupJob() {
  const retentionDays = parseInt(process.env.AUDIT_LOG_RETENTION_DAYS ?? '7', 10)
  console.log(`[audit-cleanup] Iniciado — retención ${retentionDays} días — chequeo cada medianoche`)

  // Al arrancar: si hay logs vencidos (el job se perdió por reinicio), ejecutar de inmediato
  runCleanupIfOverdue(retentionDays).catch(e => console.error('[audit-cleanup] error en chequeo inicial:', e))

  // Corre cada retentionDays días a medianoche (ej: cada 7 días si retentionDays=7).
  // runCleanupIfOverdue al arrancar cubre reinicios del contenedor.
  function scheduleNext() {
    const now  = new Date()
    const next = new Date(now)
    next.setDate(now.getDate() + retentionDays)
    next.setHours(0, 0, 0, 0)
    const ms = next.getTime() - now.getTime()
    console.log(`[audit-cleanup] Próxima ejecución: ${next.toLocaleDateString('es-EC')} 00:00 (en ${retentionDays} días)`)
    setTimeout(async () => {
      await runCleanup().catch(e => console.error('[audit-cleanup] error:', e))
      scheduleNext()
    }, ms)
  }

  scheduleNext()
}

// Ejecuta el cleanup solo si hay logs vencidos (catch-up tras reinicio)
async function runCleanupIfOverdue(retentionDays: number) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - retentionDays)
  const count = await prisma.auditLog.count({ where: { createdAt: { lt: cutoff } } })
  if (count > 0) {
    console.log(`[audit-cleanup] ${count} log(s) vencidos al arrancar — ejecutando respaldo inmediato`)
    await runCleanup()
  }
}

async function runCleanup() {
  const retentionDays = parseInt(process.env.AUDIT_LOG_RETENTION_DAYS ?? '7', 10)
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - retentionDays)

  const tenants = await prisma.auditLog.groupBy({
    by: ['tenantId'],
    where: { createdAt: { lt: cutoff } },
  })

  if (tenants.length === 0) return

  console.log(`[audit-cleanup] ${tenants.length} empresa(s) con logs vencidos (corte: ${cutoff.toISOString().slice(0, 10)})`)

  let ok = 0
  let fail = 0
  for (const { tenantId } of tenants) {
    try {
      await backupAndDeleteTenantLogs(tenantId, cutoff)
      ok++
    } catch (e) {
      fail++
      console.error(`[audit-cleanup] Error en tenant ${tenantId}:`, e)
    }
  }

  console.log(`[audit-cleanup] Completado — OK: ${ok}  Falló: ${fail}`)
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
