import { withAdmin, apiOk, apiBadRequest } from '@attendance/shared'
import * as svc from '@/modules/attendance/attendance.service'

type Ctx = { params: Promise<{ employeeId: string }> }

export const GET = withAdmin(async (req: Request, { tenantId }, { params }: Ctx) => {
  const { employeeId } = await params
  const q              = new URL(req.url).searchParams
  const from           = q.get('from') ?? ''
  const to             = q.get('to')   ?? ''
  if (!from || !to) return apiBadRequest('Se requieren los parámetros from y to.', 'MISSING_PARAMS')
  const page     = Number(q.get('page'))     || 1
  const pageSize = Number(q.get('pageSize')) || 30
  return apiOk(await svc.getByEmployee(employeeId, tenantId, from, to, page, pageSize))
})
