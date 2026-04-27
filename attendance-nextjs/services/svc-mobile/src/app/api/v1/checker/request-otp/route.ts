import { withPublic, apiOk } from '@attendance/shared'
import { z } from 'zod'
import * as svc from '@/modules/checker/checker.service'

const schema = z.object({
  checkerKey:   z.string().min(1),
  employeeCode: z.string().min(1),
  pin:          z.string().min(1),
})

export const POST = withPublic(async (req: Request) => {
  const body = schema.parse(await req.json())
  // .NET returns plain string (masked email) as data — not wrapped in { maskedEmail }
  const maskedEmail = await svc.requestOtp(body.checkerKey, body.employeeCode, body.pin)
  return apiOk(maskedEmail, 'Código enviado.')
})
