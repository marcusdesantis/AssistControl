import { withPlanGate, apiOk, createLog, getClientIp } from '@attendance/shared'
import { bodySchema } from '../schedules.schema'
import * as svc from '@/modules/schedules/schedules.service'

type Ctx = { params: Promise<{ id: string }> }

export const GET = withPlanGate('schedules', async (_req: Request, { tenantId }, { params }: Ctx) => {
  const { id } = await params
  return apiOk(await svc.getById(id, tenantId))
})

export const PUT = withPlanGate('schedules', async (req: Request, { tenantId, admin }, { params }: Ctx) => {
  const { id } = await params
  const dto    = bodySchema.parse(await req.json())
  const result = await svc.update(id, tenantId, dto)
  createLog({ tenantId, userId: admin.sub, userName: admin.username, action: 'schedule.update', module: 'schedules', detail: { scheduleId: id, name: dto.name }, ip: getClientIp(req) })
  return apiOk(result, 'Horario actualizado.')
})

export const DELETE = withPlanGate('schedules', async (req: Request, { tenantId, admin }, { params }: Ctx) => {
  const { id }       = await params
  const reassignToId = new URL(req.url).searchParams.get('reassignTo') ?? undefined
  const sch = await svc.getById(id, tenantId)
  await svc.remove(id, tenantId, reassignToId)
  createLog({ tenantId, userId: admin.sub, userName: admin.username, action: 'schedule.delete', module: 'schedules', detail: { name: sch?.name ?? id }, ip: getClientIp(req) })
  return apiOk(null, 'Horario eliminado.')
})
