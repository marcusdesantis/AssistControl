import { withPlanGate, apiOk } from '@attendance/shared'
import { z } from 'zod'
import * as svc from '@/modules/positions/positions.service'

const bodySchema = z.object({ name: z.string().min(1), description: z.string().nullish() })
type Ctx = { params: Promise<{ id: string }> }

export const PUT = withPlanGate('organization', async(req: Request, { tenantId }, { params }: Ctx) => {
  const { id }                = await params
  const { name, description } = bodySchema.parse(await req.json())
  return apiOk(await svc.update(id, tenantId, name, description), 'Cargo actualizado.')
})

export const DELETE = withPlanGate('organization', async(req: Request, { tenantId }, { params }: Ctx) => {
  const { id }       = await params
  const reassignToId = new URL(req.url).searchParams.get('reassignToId') ?? undefined
  await svc.remove(id, tenantId, reassignToId)
  return apiOk(null, 'Cargo eliminado.')
})
