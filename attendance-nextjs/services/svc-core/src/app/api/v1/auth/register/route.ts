import { withPublic, apiCreated, apiBadRequest, createLog, getClientIp } from '@attendance/shared'
import { registerSchema } from '@/modules/auth/auth.schema'
import * as svc from '@/modules/auth/auth.service'

export const POST = withPublic(async (req: Request) => {
  const dto    = registerSchema.parse(await req.json())
  const result = await svc.registerTenant(dto)
  createLog({ tenantId: result.tenantId, action: 'tenant.register', module: 'auth', detail: { companyName: dto.companyName, email: dto.email }, ip: getClientIp(req) })
  return apiCreated(result, 'Empresa registrada correctamente.')
})
