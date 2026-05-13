import { withPlanGate, apiOk, createLog, getClientIp } from '@attendance/shared'
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

export const POST = withPlanGate('prioritySupport', async (req, { tenantId, admin }) => {
  const body   = createSchema.parse(await req.json())
  const result = await svc.createTicket(tenantId, body)
  createLog({ tenantId, userId: admin.sub, userName: admin.username, action: 'support.create_ticket', module: 'support', detail: { subject: body.subject, category: body.category }, ip: getClientIp(req) })
  return apiOk(result)
})
