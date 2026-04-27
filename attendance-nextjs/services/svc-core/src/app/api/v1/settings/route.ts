import { withAdmin, apiOk } from '@attendance/shared'
import { updateSettingsSchema } from '@/modules/tenants/tenants.schema'
import * as svc from '@/modules/tenants/tenants.service'

export const GET = withAdmin(async (_req: Request, { tenantId }) => {
  return apiOk(await svc.getSettings(tenantId))
})

export const PUT = withAdmin(async (req: Request, { tenantId }) => {
  const dto = updateSettingsSchema.parse(await req.json())
  return apiOk(await svc.updateSettings(tenantId, dto), 'Configuración guardada.')
})
