import { withAdmin, apiOk, createLog, getClientIp } from '@attendance/shared'
import { z } from 'zod'
import * as svc from '@/modules/attendance/attendance.service'

const schema = z.object({
  employeeId:     z.string().uuid(),
  notes:          z.string().nullish(),
  latitude:       z.number().nullish(),
  longitude:      z.number().nullish(),
  registeredFrom: z.string().default('Web'),
})

export const POST = withAdmin(async (req: Request, { tenantId, admin }) => {
  const { employeeId, ...opts } = schema.parse(await req.json())
  const result = await svc.checkIn(tenantId, employeeId, opts)
  createLog({ tenantId, userId: admin.sub, userName: admin.username, action: 'attendance.update', module: 'attendance', detail: { name: result.employeeName, code: result.employeeCode, date: String(result.date).slice(0,10), event: 'check-in' }, ip: getClientIp(req) })
  return apiOk(result, 'Entrada registrada.')
})
