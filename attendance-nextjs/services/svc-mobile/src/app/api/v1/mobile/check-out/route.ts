import { withEmployee, apiOk } from '@attendance/shared'
import * as svc from '@/modules/mobile/mobile.service'

export const POST = withEmployee(async (_req: Request, { employeeId, tenantId }) => {
  return apiOk(await svc.checkOut(employeeId, tenantId))
})
