import { withPublic, apiOk, apiBadRequest } from '@attendance/shared'
import * as svc from '@/modules/auth/auth.service'

export const GET = withPublic(async (req: Request) => {
  const url   = new URL(req.url)
  const token = url.searchParams.get('token')
  if (!token) return apiBadRequest('Token requerido.')
  const result = await svc.verifyEmail(token)
  return apiOk(result, 'Correo verificado correctamente.')
})
