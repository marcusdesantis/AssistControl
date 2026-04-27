import { withPlanGate, apiOk } from '@attendance/shared'
import * as svc from '@/modules/schedules/schedules.service'
import { bodySchema } from './schedules.schema'

export const GET = withPlanGate('schedules', async (_req: Request, { tenantId }) => {
  return apiOk(await svc.getAll(tenantId))
})

export const POST = withPlanGate('schedules', async (req: Request, { tenantId }) => {
  const dto = bodySchema.parse(await req.json())
  return apiOk(await svc.create(tenantId, dto), 'Horario creado.')
})
