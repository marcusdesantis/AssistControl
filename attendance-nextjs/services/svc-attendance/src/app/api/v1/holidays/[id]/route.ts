import { withPlanGate, apiOk } from '@attendance/shared'
import * as svc from '@/modules/holidays/holidays.service'

type Ctx = { params: Promise<{ id: string }> }

export const PUT = withPlanGate('schedules', async (req: Request, { tenantId }, { params }: Ctx) => {
  const { id } = await params
  const body   = await req.json() as any
  if (!body.date || !body.name)
    return Response.json({ message: 'Fecha y nombre son requeridos.' }, { status: 400 })
  return apiOk(await svc.update(id, tenantId, body), 'Día inhábil actualizado.')
})

export const DELETE = withPlanGate('schedules', async (_req: Request, { tenantId }, { params }: Ctx) => {
  const { id } = await params
  await svc.remove(id, tenantId)
  return apiOk(null, 'Día inhábil eliminado.')
})
