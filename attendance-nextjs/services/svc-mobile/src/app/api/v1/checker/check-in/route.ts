import { withPublic, apiOk } from '@attendance/shared'
import { z } from 'zod'
import * as svc from '@/modules/checker/checker.service'

const schema = z.object({
  checkerKey:   z.string().min(1),
  employeeCode: z.string().min(1),
  pin:          z.string().min(1),
  otpCode:      z.string().optional().nullable(),
})

export const POST = withPublic(async (req: Request) => {
  const body = schema.parse(await req.json())
  return apiOk(await svc.checkIn(body.checkerKey, body.employeeCode, body.pin, body.otpCode))
})
