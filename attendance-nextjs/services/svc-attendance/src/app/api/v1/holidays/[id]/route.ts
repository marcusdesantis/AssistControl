import { withPlanGate, apiOk, createLog, getClientIp } from '@attendance/shared'
import * as svc from '@/modules/holidays/holidays.service'

type Ctx = { params: Promise<{ id: string }> }

export const PUT = withPlanGate('schedules', async (req: Request, { tenantId, admin }, { params }: Ctx) => {
  const { id } = await params
  const body   = await req.json() as any
  if (!body.date || !body.name)
    return Response.json({ message: 'Fecha y nombre son requeridos.' }, { status: 400 })
  const result = await svc.update(id, tenantId, body)
  createLog({ tenantId, userId: admin.sub, userName: admin.username, action: 'holiday.update', module: 'holidays', detail: { date: body.date, name: body.name }, ip: getClientIp(req) })
  return apiOk(result, 'Día inhábil actualizado.')
})

export const DELETE = withPlanGate('schedules', async (req: Request, { tenantId, admin }, { params }: Ctx) => {
  const { id } = await params
  await svc.remove(id, tenantId)
  createLog({ tenantId, userId: admin.sub, userName: admin.username, action: 'holiday.delete', module: 'holidays', detail: { holidayId: id }, ip: getClientIp(req) })
  return apiOk(null, 'Día inhábil eliminado.')
})
