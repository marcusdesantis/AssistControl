import { withAdmin, apiOk } from '@attendance/shared'
import * as svc from '@/modules/tenants/tenants.service'

export const POST = withAdmin(async (_req: Request, { tenantId }) => {
  return apiOk(await svc.regenerateCheckerKey(tenantId), 'Clave regenerada.')
})
