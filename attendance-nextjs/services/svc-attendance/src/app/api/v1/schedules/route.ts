import { withPlanGate, apiOk, createLog, getClientIp } from '@attendance/shared'
import * as svc from '@/modules/schedules/schedules.service'
import { bodySchema } from './schedules.schema'

export const GET = withPlanGate('schedules', async (_req: Request, { tenantId }) => {
  return apiOk(await svc.getAll(tenantId))
})

export const POST = withPlanGate('schedules', async (req: Request, { tenantId, admin }) => {
  const dto    = bodySchema.parse(await req.json())
  const result = await svc.create(tenantId, dto)
  createLog({ tenantId, userId: admin.sub, userName: admin.username, action: 'schedule.create', module: 'schedules', detail: { name: dto.name }, ip: getClientIp(req) })
  return apiOk(result, 'Horario creado.')
})
