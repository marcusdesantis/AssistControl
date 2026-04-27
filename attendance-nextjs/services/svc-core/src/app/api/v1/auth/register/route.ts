import { withPublic, apiCreated, apiBadRequest } from '@attendance/shared'
import { registerSchema } from '@/modules/auth/auth.schema'
import * as svc from '@/modules/auth/auth.service'

export const POST = withPublic(async (req: Request) => {
  const dto = registerSchema.parse(await req.json())
  const result = await svc.registerTenant(dto)
  return apiCreated(result, 'Empresa registrada correctamente.')
})
