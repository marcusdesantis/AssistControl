import { withPublic, apiOk } from '@attendance/shared'
import { z } from 'zod'
import * as svc from '@/modules/tenants/tenants.service'

const registerSchema = z.object({
  firstName:    z.string().min(1),
  lastName:     z.string().min(1),
  email:        z.string().email(),
  username:     z.string().min(3),
  password:     z.string().min(6),
  phone:        z.string().nullish(),
  departmentId: z.string().uuid().nullish(),
  positionId:   z.string().uuid().nullish(),
})

export const POST = withPublic(async (req: Request, { params }: { params: Promise<{ token: string }> }) => {
  const { token } = await params
  const data      = registerSchema.parse(await req.json())
  return apiOk(await svc.registerFromInvitation(token, data), 'Registro completado.')
})
