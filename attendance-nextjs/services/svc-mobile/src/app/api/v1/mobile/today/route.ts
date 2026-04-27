import { withEmployee, apiOk } from '@attendance/shared'
import * as svc from '@/modules/mobile/mobile.service'

export const GET = withEmployee(async (_req: Request, { employeeId, tenantId }) => {
  return apiOk(await svc.getTodayStatus(employeeId, tenantId))
})
