import { withEmployee, apiOk } from '@attendance/shared'
import * as svc from '@/modules/mobile/mobile.service'

export const GET = withEmployee(async (req: Request, { employeeId, tenantId }) => {
  const p        = new URL(req.url).searchParams
  const page     = Number(p.get('page')     ?? 1)
  const pageSize = Number(p.get('pageSize') ?? 20)
  return apiOk(await svc.getMessages(employeeId, tenantId, page, pageSize))
})
