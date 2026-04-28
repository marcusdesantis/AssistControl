import { withPlanGate, apiOk } from '@attendance/shared'
import * as svc from '@/modules/support/support.service'

export const GET = withPlanGate('prioritySupport', async (_req, { tenantId }, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  return apiOk(await svc.getTicket(tenantId, id))
})
