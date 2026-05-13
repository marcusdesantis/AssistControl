import { withAdmin, apiOk, createLog, getClientIp } from '@attendance/shared'
import { changePasswordSchema } from '@/modules/auth/auth.schema'
import * as svc from '@/modules/auth/auth.service'

export const POST = withAdmin(async (req: Request, { admin, tenantId }) => {
  const dto = changePasswordSchema.parse(await req.json())
  await svc.changePassword(admin.sub, dto)
  createLog({ tenantId, userId: admin.sub, userName: admin.username, action: 'auth.change_password', module: 'auth', ip: getClientIp(req) })
  return apiOk(null, 'Contraseña cambiada correctamente.')
})
