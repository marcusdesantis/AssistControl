export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startAuditCleanupJob }    = await import('./jobs/auditCleanup')
    const { startPendingCleanupJob }  = await import('./jobs/pendingCleanup')
    const { startTenantDeletionJob }  = await import('./jobs/tenantDeletionJob')
    startAuditCleanupJob()
    startPendingCleanupJob()
    startTenantDeletionJob()
  }
}
