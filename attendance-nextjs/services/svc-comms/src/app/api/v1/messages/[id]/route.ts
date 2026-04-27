import { withPlanGate, apiOk } from '@attendance/shared'
import * as svc from '@/modules/messages/messages.service'

type Ctx = { params: Promise<{ id: string }> }

export const PATCH = withPlanGate('messages', async (req: Request, { tenantId }, { params }: Ctx) => {
  const { id }          = await params
  const { allowDelete } = await req.json() as { allowDelete: boolean }
  await svc.updateAllowDelete(id, tenantId, !!allowDelete)
  return apiOk(null, 'Mensaje actualizado.')
})

export const DELETE = withPlanGate('messages', async (_req: Request, { tenantId }, { params }: Ctx) => {
  const { id } = await params
  await svc.remove(id, tenantId)
  return apiOk(null, 'Mensaje eliminado.')
})
