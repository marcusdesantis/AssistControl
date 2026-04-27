import { withAdmin, apiOk } from '@attendance/shared'
import * as svc from '@/modules/attendance/attendance.service'

export const GET = withAdmin(async (req: Request, { tenantId }) => {
  const q          = new URL(req.url).searchParams
  const date       = q.get('date')       ?? new Date().toISOString().split('T')[0]
  const page       = Number(q.get('page'))       || 1
  const pageSize   = Number(q.get('pageSize'))   || 50
  const search     = q.get('search')     ?? undefined
  const department = q.get('department') ?? undefined
  const status     = q.get('status')     ?? undefined
  return apiOk(await svc.getDayView(tenantId, date, page, pageSize, search, department, status))
})
