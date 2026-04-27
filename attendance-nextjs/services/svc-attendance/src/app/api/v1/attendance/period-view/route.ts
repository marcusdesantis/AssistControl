import { withAdmin, apiOk, apiBadRequest } from '@attendance/shared'
import * as svc from '@/modules/attendance/attendance.service'

export const GET = withAdmin(async (req: Request, { tenantId }) => {
  const q          = new URL(req.url).searchParams
  const from       = q.get('from') ?? ''
  const to         = q.get('to')   ?? ''
  if (!from || !to) return apiBadRequest('Se requieren los parámetros from y to.', 'MISSING_PARAMS')
  const page       = Number(q.get('page'))       || 1
  const pageSize   = Number(q.get('pageSize'))   || 50
  const search     = q.get('search')     ?? undefined
  const department = q.get('department') ?? undefined
  return apiOk(await svc.getPeriodView(tenantId, from, to, page, pageSize, search, department))
})
