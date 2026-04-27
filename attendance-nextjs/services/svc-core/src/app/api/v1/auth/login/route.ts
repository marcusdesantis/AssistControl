import { withPublic, apiOk } from '@attendance/shared'
import { loginSchema } from '@/modules/auth/auth.schema'
import * as svc from '@/modules/auth/auth.service'

export const POST = withPublic(async (req: Request) => {
  const dto = loginSchema.parse(await req.json())
  try {
    const result = await svc.login(dto)
    return apiOk(result, 'Login exitoso.')
  } catch (e: any) {
    return Response.json({ success: false, message: e.message, errorCode: e.code }, { status: 401 })
  }
})
