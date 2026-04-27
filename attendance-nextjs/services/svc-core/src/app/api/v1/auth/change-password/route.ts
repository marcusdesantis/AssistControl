import { withAdmin, apiOk } from '@attendance/shared'
import { changePasswordSchema } from '@/modules/auth/auth.schema'
import * as svc from '@/modules/auth/auth.service'

export const POST = withAdmin(async (req: Request, { admin }) => {
  const dto = changePasswordSchema.parse(await req.json())
  await svc.changePassword(admin.sub, dto)
  return apiOk(null, 'Contraseña cambiada correctamente.')
})
