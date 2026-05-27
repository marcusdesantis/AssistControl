import { withPublic, apiOk, apiBadRequest, createLog, getClientIp } from '@attendance/shared'
import * as svc from '@/modules/auth/auth.service'

export const GET = withPublic(async (req: Request) => {
  const url   = new URL(req.url)
  const token = url.searchParams.get('token')
  if (!token) return apiBadRequest('Token requerido.')

  const result = await svc.verifyEmail(token)
  const ip     = getClientIp(req)

  // Log: correo verificado
  createLog({ tenantId: result.tenantId, action: 'auth.email_verified', module: 'auth', detail: { companyName: result.companyName }, ip })
  // Log: tenant creado
  createLog({ tenantId: result.tenantId, action: 'tenant.register', module: 'auth', detail: { companyName: result.companyName, selfRegistered: true }, ip })
  // Log: usuario admin creado
  createLog({ tenantId: result.tenantId, action: 'user.create', module: 'auth', detail: { role: 'Admin', origin: 'self-register' }, ip })
  // Log: suscripción creada
  createLog({ tenantId: result.tenantId, action: 'subscription.create', module: 'billing', detail: { plan: 'default', origin: 'self-register' }, ip })

  return apiOk(result, 'Correo verificado correctamente.')
})
