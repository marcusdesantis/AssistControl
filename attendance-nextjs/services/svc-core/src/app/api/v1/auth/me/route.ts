import { withAdmin, apiOk } from '@attendance/shared'
import { updateMeSchema } from '@/modules/auth/auth.schema'
import * as svc from '@/modules/auth/auth.service'

export const GET = withAdmin(async (_req: Request, { admin }) => {
  return apiOk(admin)
})

export const PATCH = withAdmin(async (req: Request, { admin }) => {
  const dto = updateMeSchema.parse(await req.json())
  const updated = await svc.updateMe(admin.sub, dto)
  return apiOk(updated, 'Perfil actualizado correctamente.')
})
