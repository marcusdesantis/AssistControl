import { withAdmin, apiOk } from '@attendance/shared'
import * as svc from '@/modules/auth/auth.service'

export const POST = withAdmin(async (_req: Request, { admin }) => {
  await svc.logout(admin.sub)
  return apiOk(null, 'Sesión cerrada correctamente.')
})
