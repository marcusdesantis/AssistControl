import { withAdmin, apiOk, createLog, getClientIp } from '@attendance/shared'
import { updateProfileSchema } from '@/modules/tenants/tenants.schema'
import * as svc from '@/modules/tenants/tenants.service'

export const GET = withAdmin(async (_req: Request, { tenantId }) => {
  const profile = await svc.getProfile(tenantId)
  return apiOk(profile)
})

export const PUT = withAdmin(async (req: Request, { tenantId, admin }) => {
  const dto = updateProfileSchema.parse(await req.json())
  const result = await svc.updateProfile(tenantId, dto)
  createLog({ tenantId, userId: admin.sub, userName: admin.username, action: 'company.update', module: 'company', ip: getClientIp(req) })
  return apiOk(result, 'Perfil de empresa actualizado.')
})
