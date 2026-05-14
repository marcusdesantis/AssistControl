import { withPlanGate, apiOk, createLog, getClientIp, prisma } from '@attendance/shared'
import { z } from 'zod'
import * as svc from '@/modules/support/support.service'

const schema = z.object({ body: z.string().min(1).max(5000) })

export const POST = withPlanGate('prioritySupport', async (req, { tenantId, admin }, { params }: { params: Promise<{ id: string }> }) => {
  const { id }   = await params
  const { body } = schema.parse(await req.json())
  const ticket = await prisma.supportTicket.findFirst({ where: { id, tenantId }, select: { subject: true } })
  const result = await svc.addMessage(tenantId, id, body)
  createLog({ tenantId, userId: admin.sub, userName: admin.username, action: 'support.reply', module: 'support', detail: { subject: ticket?.subject }, ip: getClientIp(req) })
  return apiOk(result)
})
