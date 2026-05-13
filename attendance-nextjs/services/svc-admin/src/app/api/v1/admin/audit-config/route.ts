import { withSuperadmin, apiOk } from '@attendance/shared'

export const GET = withSuperadmin(async () => {
  const retentionDays = parseInt(process.env.AUDIT_LOG_RETENTION_DAYS ?? '7', 10)
  const mode = retentionDays <= 14 ? 'weekly' : 'monthly'
  return apiOk({ retentionDays, mode })
})
