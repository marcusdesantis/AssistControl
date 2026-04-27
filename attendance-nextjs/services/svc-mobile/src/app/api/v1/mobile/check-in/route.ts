import { withEmployee, apiOk } from '@attendance/shared'
import { z } from 'zod'
import * as svc from '@/modules/mobile/mobile.service'

const schema = z.object({
  pin:       z.string().min(1),
  otpCode:   z.string().optional().nullable(),
  latitude:  z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
})

export const POST = withEmployee(async (req: Request, { employeeId, tenantId }) => {
  const body = schema.parse(await req.json())
  return apiOk(await svc.checkIn(employeeId, tenantId, body.pin, {
    otpCode:   body.otpCode,
    latitude:  body.latitude,
    longitude: body.longitude,
  }))
})
