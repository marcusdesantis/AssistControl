import { withPublic, apiOk, createLog, getClientIp } from '@attendance/shared'
import { loginSchema } from '@/modules/auth/auth.schema'
import * as svc from '@/modules/auth/auth.service'

export const POST = withPublic(async (req: Request) => {
  const dto = loginSchema.parse(await req.json())
  try {
    const result = await svc.login(dto)
    createLog({ tenantId: result.user.tenantId, userId: result.user.id, userEmail: result.user.email, userName: result.user.username, action: 'auth.login', module: 'auth', ip: getClientIp(req) })
    return apiOk(result, 'Login exitoso.')
  } catch (e: any) {
    return Response.json({ success: false, message: e.message, errorCode: e.code }, { status: 401 })
  }
})
