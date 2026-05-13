import { apiOk, apiBadRequest, createLog, getClientIp } from '@attendance/shared'
import { resetPasswordSchema } from '@/modules/auth/auth.schema'
import * as svc from '@/modules/auth/auth.service'
import prisma from '@attendance/shared/src/prisma'

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token') ?? ''
  if (!token) return apiBadRequest('Token requerido.', 'INVALID_TOKEN')

  const record = await prisma.passwordResetToken.findUnique({ where: { token } })
  if (!record)                      return apiBadRequest('El enlace de recuperación no es válido.', 'INVALID_TOKEN')
  if (record.isUsed)                return apiBadRequest('Este enlace ya fue utilizado. Solicita uno nuevo.', 'TOKEN_USED')
  if (record.expiresAt < new Date()) return apiBadRequest('El enlace ha expirado. Solicita uno nuevo.', 'TOKEN_EXPIRED')

  return apiOk(null, 'Token válido.')
}

export async function POST(req: Request) {
  const dto    = resetPasswordSchema.parse(await req.json())
  const result = await svc.resetPassword(dto)
  if (result) createLog({ tenantId: result.tenantId, userId: result.userId, userName: result.username, action: 'auth.reset_password', module: 'auth', ip: getClientIp(req) })
  return apiOk(null, 'Contraseña restablecida correctamente. Ya puedes iniciar sesión.')
}
