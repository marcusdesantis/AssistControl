import { withEmployee, apiOk } from '@attendance/shared'
import * as svc from '@/modules/mobile/mobile.service'

export const GET = withEmployee(async (req: Request, { employeeId, tenantId }) => {
  const p        = new URL(req.url).searchParams
  const from     = p.get('from')     ?? undefined
  const to       = p.get('to')       ?? undefined
  const page     = Number(p.get('page')     ?? 1)
  const pageSize = Number(p.get('pageSize') ?? 20)
  const status   = p.get('status')   ?? undefined
  return apiOk(await svc.getHistory(employeeId, tenantId, from, to, page, pageSize, status))
})
