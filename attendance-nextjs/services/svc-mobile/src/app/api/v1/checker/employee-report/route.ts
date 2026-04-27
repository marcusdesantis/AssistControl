import { withPublic, apiOk } from '@attendance/shared'
import * as svc from '@/modules/checker/checker.service'

export const GET = withPublic(async (req: Request) => {
  const p          = new URL(req.url).searchParams
  const checkerKey = p.get('checkerKey') ?? ''
  const employeeId = p.get('employeeId') ?? ''
  const from       = p.get('from') ?? ''
  const to         = p.get('to')   ?? ''
  return apiOk(await svc.getEmployeeReport(checkerKey, employeeId, from, to))
})
