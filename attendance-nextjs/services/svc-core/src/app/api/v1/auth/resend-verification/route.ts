import { withPublic, apiOk, apiBadRequest } from '@attendance/shared'
import { z } from 'zod'
import * as svc from '@/modules/auth/auth.service'

const schema = z.object({ email: z.string().email() })

export const POST = withPublic(async (req: Request) => {
  const { email } = schema.parse(await req.json())
  const result = await svc.resendVerificationEmail(email)
  return apiOk(result, 'Correo de verificación reenviado.')
})
