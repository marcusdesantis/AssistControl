import { withPublic, apiOk, createLog, getClientIp } from '@attendance/shared'
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
  const result    = await svc.registerFromInvitation(token, data)
  if (result?.tenantId) {
    createLog({ tenantId: result.tenantId, userName: data.username, action: 'employee.self_register', module: 'employees', detail: { name: data.firstName + ' ' + data.lastName, email: data.email }, ip: getClientIp(req) })
  }
  return apiOk(result, 'Registro completado.')
})
