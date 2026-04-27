import { withPlanGate, apiOk } from '@attendance/shared'
import { bodySchema } from '../schedules.schema'
import * as svc from '@/modules/schedules/schedules.service'

type Ctx = { params: Promise<{ id: string }> }

export const GET = withPlanGate('schedules', async (_req: Request, { tenantId }, { params }: Ctx) => {
  const { id } = await params
  return apiOk(await svc.getById(id, tenantId))
})

export const PUT = withPlanGate('schedules', async (req: Request, { tenantId }, { params }: Ctx) => {
  const { id } = await params
  const dto    = bodySchema.parse(await req.json())
  return apiOk(await svc.update(id, tenantId, dto), 'Horario actualizado.')
})

export const DELETE = withPlanGate('schedules', async (req: Request, { tenantId }, { params }: Ctx) => {
  const { id }       = await params
  const reassignToId = new URL(req.url).searchParams.get('reassignTo') ?? undefined
  await svc.remove(id, tenantId, reassignToId)
  return apiOk(null, 'Horario eliminado.')
})
