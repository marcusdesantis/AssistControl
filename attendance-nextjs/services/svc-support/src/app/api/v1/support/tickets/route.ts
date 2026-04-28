import { withPlanGate, apiOk } from '@attendance/shared'
import { z } from 'zod'
import * as svc from '@/modules/support/support.service'

const createSchema = z.object({
  subject:     z.string().min(5).max(200),
  description: z.string().min(10).max(5000),
  category:    z.enum(['general', 'billing', 'technical', 'other']).default('general'),
})

export const GET = withPlanGate('prioritySupport', async (_req, { tenantId }) => {
  return apiOk(await svc.getTickets(tenantId))
})

export const POST = withPlanGate('prioritySupport', async (req, { tenantId }) => {
  const body = createSchema.parse(await req.json())
  return apiOk(await svc.createTicket(tenantId, body))
})
