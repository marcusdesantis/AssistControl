import { withPlanGate, apiOk, createLog, getClientIp } from '@attendance/shared'
import * as svc from '@/modules/reports/reports.service'

type Ctx = { params: Promise<{ reportType: string }> }

export const GET = withPlanGate('reports', async (req: Request, { tenantId, admin }, { params }: Ctx) => {
  const { reportType } = await params
  const p          = new URL(req.url).searchParams
  const from       = p.get('from')       ?? ''
  const to         = p.get('to')         ?? ''
  const page       = Number(p.get('page')     ?? 1)
  const pageSize   = Number(p.get('pageSize') ?? 20)
  const department = p.get('department') ?? undefined
  const search     = p.get('search')     ?? undefined
  if (page === 1) createLog({ tenantId, userId: admin.sub, userName: admin.username, action: 'report.view', module: 'reports', detail: { reportType, from, to }, ip: getClientIp(req) })
  return apiOk(await svc.getReport(tenantId, reportType, from, to, page, pageSize, department, search))
})
