import { withPublic, apiOk } from '@attendance/shared'
import { refreshSchema } from '@/modules/auth/auth.schema'
import * as svc from '@/modules/auth/auth.service'

export const POST = withPublic(async (req: Request) => {
  const { token } = refreshSchema.parse(await req.json())
  try {
    const result = await svc.refreshToken(token)
    return apiOk(result, 'Token renovado.')
  } catch (e: any) {
    return Response.json({ success: false, message: e.message, errorCode: e.code }, { status: 401 })
  }
})
