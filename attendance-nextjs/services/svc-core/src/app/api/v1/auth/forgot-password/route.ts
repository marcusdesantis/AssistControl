import { apiOk, apiBadRequest } from '@attendance/shared'
import { forgotPasswordSchema } from '@/modules/auth/auth.schema'
import * as svc from '@/modules/auth/auth.service'

export async function POST(req: Request) {
  try {
    const dto         = forgotPasswordSchema.parse(await req.json())
    const frontendUrl = process.env.FRONTEND_URL ?? process.env.APP_URL ?? 'http://localhost:3000'
    await svc.forgotPassword(dto, frontendUrl)
    return apiOk(null, 'Si el correo existe, recibirás un enlace para restablecer tu contraseña.')
  } catch (err: any) {
    if (err?.code === 'EMAIL_NOT_FOUND')
      return apiBadRequest('No existe una cuenta asociada a este correo electrónico.', 'EMAIL_NOT_FOUND')
    if (err?.code === 'SMTP_NOT_CONFIGURED')
      return apiBadRequest('El servicio de correo no está configurado. Contacta al administrador del sistema.', 'SMTP_NOT_CONFIGURED')
    throw err
  }
}
