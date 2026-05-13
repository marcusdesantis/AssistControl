import { withPlanGate, apiOk, createLog, getClientIp } from '@attendance/shared'
import * as svc from '@/modules/reports/reports.service'

export const GET = withPlanGate('reports', async (req: Request, { tenantId, admin }) => {
  const p            = new URL(req.url).searchParams
  const employeeCode = p.get('employeeCode') ?? ''
  const from         = p.get('from') ?? ''
  const to           = p.get('to')   ?? ''
  const reportType   = p.get('reportType') ?? 'general'
  createLog({ tenantId, userId: admin.sub, userName: admin.username, action: 'report.employee_detail', module: 'reports', detail: { employeeCode, from, to, reportType }, ip: getClientIp(req) })
  return apiOk(await svc.getEmployeeDetail(tenantId, employeeCode, from, to, reportType))
})
