import { withAdmin, apiOk, apiBadRequest } from '@attendance/shared'
import * as svc from '@/modules/attendance/attendance.service'

export const GET = withAdmin(async (req: Request, { tenantId }) => {
  const from = new URL(req.url).searchParams.get('from') ?? ''
  const to   = new URL(req.url).searchParams.get('to')   ?? ''
  if (!from || !to) return apiBadRequest('Se requieren los parámetros from y to.', 'MISSING_PARAMS')
  return apiOk(await svc.getByDateRange(tenantId, from, to))
})
