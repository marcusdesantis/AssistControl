import { withAdmin, apiOk } from '@attendance/shared'
import * as svc from '@/modules/employees/employees.service'

export const GET = withAdmin(async (_req: Request, { tenantId }) => {
  return apiOk(await svc.getNextCode(tenantId))
})
