import { withPlanGate, apiOk, createLog, getClientIp } from '@attendance/shared'
import * as svc from '@/modules/holidays/holidays.service'

export const GET = withPlanGate('schedules', async (req: Request, { tenantId }) => {
  const year = Number(new URL(req.url).searchParams.get('year') ?? new Date().getFullYear())
  return apiOk(await svc.getAll(tenantId, year))
})

export const POST = withPlanGate('schedules', async (req: Request, { tenantId, admin }) => {
  const body = await req.json() as any
  if (body.action === 'generate') {
    const year = Number(body.year ?? new Date().getFullYear())
    return apiOk(await svc.generate(tenantId, year))
  }
  if (!body.date || !body.name)
    return Response.json({ message: 'Fecha y nombre son requeridos.' }, { status: 400 })
  const result = await svc.create(tenantId, body)
  createLog({ tenantId, userId: admin.sub, userName: admin.username, action: 'holiday.create', module: 'holidays', detail: { date: body.date, name: body.name }, ip: getClientIp(req) })
  return apiOk(result, 'Día inhábil creado.')
})
