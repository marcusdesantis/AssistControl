import { withAdmin, apiOk, apiBadRequest } from '@attendance/shared'
import { verifyPasswordSchema } from '@/modules/auth/auth.schema'
import * as svc from '@/modules/auth/auth.service'

export const POST = withAdmin(async (req: Request, { admin }) => {
  const { password } = verifyPasswordSchema.parse(await req.json())
  const valid = await svc.verifyUserPassword(admin.sub, password)
  if (!valid) return apiBadRequest('Contraseña incorrecta.', 'INVALID_PASSWORD')
  return apiOk(null, 'Contraseña verificada.')
})
