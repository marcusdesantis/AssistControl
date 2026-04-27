import { withPlanGate, apiOk } from '@attendance/shared'
import * as svc from '@/modules/messages/messages.service'

type Ctx = { params: Promise<{ employeeId: string }> }

export const GET = withPlanGate('messages', async (req: Request, { tenantId }, { params }: Ctx) => {
  const { employeeId } = await params
  const p        = new URL(req.url).searchParams
  const page     = Number(p.get('page')     ?? 1)
  const pageSize = Number(p.get('pageSize') ?? 20)
  return apiOk(await svc.getByEmployee(employeeId, tenantId, page, pageSize))
})
