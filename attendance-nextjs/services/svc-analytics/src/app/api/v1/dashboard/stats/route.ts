import { withAdmin, apiOk } from '@attendance/shared'
import * as svc from '@/modules/dashboard/dashboard.service'

export const GET = withAdmin(async (_req: Request, { tenantId }) => {
  return apiOk(await svc.getStats(tenantId))
})
