import { withPlanGate, apiOk, createLog, getClientIp } from '@attendance/shared'
import * as svc from '@/modules/messages/messages.service'

type Ctx = { params: Promise<{ id: string }> }

export const PATCH = withPlanGate('messages', async (req: Request, { tenantId, admin }, { params }: Ctx) => {
  const { id }          = await params
  const { allowDelete } = await req.json() as { allowDelete: boolean }
  await svc.updateAllowDelete(id, tenantId, !!allowDelete)
  createLog({ tenantId, userId: admin.sub, userName: admin.username, action: 'message.update', module: 'messages', detail: { messageId: id }, ip: getClientIp(req) })
  return apiOk(null, 'Mensaje actualizado.')
})

export const DELETE = withPlanGate('messages', async (req: Request, { tenantId, admin }, { params }: Ctx) => {
  const { id } = await params
  await svc.remove(id, tenantId)
  createLog({ tenantId, userId: admin.sub, userName: admin.username, action: 'message.delete', module: 'messages', detail: { messageId: id }, ip: getClientIp(req) })
  return apiOk(null, 'Mensaje eliminado.')
})
