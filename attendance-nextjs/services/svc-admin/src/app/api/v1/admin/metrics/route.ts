import { withSuperadmin, apiOk } from '@attendance/shared'
import { getDashboardMetrics } from '@/modules/admin/admin.service'

export const GET = withSuperadmin(async () => {
  return apiOk(await getDashboardMetrics())
})
