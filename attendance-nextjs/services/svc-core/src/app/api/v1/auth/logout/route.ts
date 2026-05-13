import { withAdmin, apiOk, createLog, getClientIp } from '@attendance/shared'
import * as svc from '@/modules/auth/auth.service'

export const POST = withAdmin(async (req: Request, { admin, tenantId }) => {
  await svc.logout(admin.sub)
  createLog({ tenantId, userId: admin.sub, userName: admin.username, action: 'auth.logout', module: 'auth', ip: getClientIp(req) })
  return apiOk(null, 'Sesión cerrada correctamente.')
})
