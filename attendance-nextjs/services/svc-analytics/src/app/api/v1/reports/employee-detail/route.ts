import { withPlanGate, apiOk } from '@attendance/shared'
import * as svc from '@/modules/reports/reports.service'

export const GET = withPlanGate('reports', async (req: Request, { tenantId }) => {
  const p            = new URL(req.url).searchParams
  const employeeCode = p.get('employeeCode') ?? ''
  const from         = p.get('from') ?? ''
  const to           = p.get('to')   ?? ''
  const reportType   = p.get('reportType') ?? 'general'
  return apiOk(await svc.getEmployeeDetail(tenantId, employeeCode, from, to, reportType))
})
