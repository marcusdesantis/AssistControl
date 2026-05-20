import { withEmployee, apiOk, createLog, getClientIp } from '@attendance/shared'
import { z } from 'zod'
import * as svc from '@/modules/mobile/mobile.service'

const schema = z.object({
  pin:          z.string().optional().nullable(),
  otpCode:      z.string().optional().nullable(),
  latitude:     z.number().optional().nullable(),
  longitude:    z.number().optional().nullable(),
  useBiometric: z.boolean().optional().default(false),
})

export const POST = withEmployee(async (req: Request, { employeeId, tenantId, employee }) => {
  const body   = schema.parse(await req.json())
  const result = await svc.checkIn(employeeId, tenantId, body.pin ?? '', {
    otpCode:      body.otpCode,
    latitude:     body.latitude,
    longitude:    body.longitude,
    useBiometric: body.useBiometric,
  })
  createLog({ tenantId, userId: employeeId, userName: employee.employeeCode, action: 'mobile.checkin', module: 'mobile', detail: { latitude: body.latitude, longitude: body.longitude }, ip: getClientIp(req), source: 'mobile' })
  return apiOk(result)
})
