import { prisma } from '@attendance/shared'

const INTERVAL_MS   = 60 * 60 * 1000     // cada hora
const GRACE_DAYS    = 3                   // días visibles después de expirar

async function runCleanup() {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - GRACE_DAYS)

  const result = await prisma.pendingRegistration.deleteMany({
    where: { expiresAt: { lt: cutoff } },
  })
  if (result.count > 0)
    console.log(`[pending-cleanup] ${result.count} registro(s) expirado(s) eliminado(s) (gracia: ${GRACE_DAYS} días)`)
}

export function startPendingCleanupJob() {
  runCleanup().catch(e => console.error('[pending-cleanup] error inicial:', e))

  function scheduleNext() {
    setTimeout(async () => {
      await runCleanup().catch(e => console.error('[pending-cleanup] error:', e))
      scheduleNext()
    }, INTERVAL_MS)
  }
  scheduleNext()
  console.log('[pending-cleanup] Job iniciado — limpieza cada hora')
}
