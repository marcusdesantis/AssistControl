import { withAdmin, apiOk, createLog, getClientIp } from '@attendance/shared'
import { z } from 'zod'
import * as svc from '@/modules/billing/billing.service'

export const GET = withAdmin(async (_req, { tenantId }) => {
  // Degradar inmediatamente si el período de gracia ya venció
  const wasAutoDowngraded = await svc.checkAndAutoDowngrade(tenantId).catch(e => {
    console.error('[subscription] auto-downgrade error', e?.message)
    return false
  })

  const sub = await svc.getSubscription(tenantId)
  if (!sub) return apiOk(null)

  const DAY_MS = 24 * 60 * 60 * 1000
  const settings = await import('@attendance/shared').then(m => m.prisma.systemSettings.findUnique({ where: { id: 'system' } }))
  const graceDays = settings?.gracePeriodDays ?? 3

  let daysUntilExpiry: number | null = null
  let inGracePeriod = false
  let graceLeft: number | null = null

  if (sub.currentPeriodEnd && !sub.plan.isFree) {
    const days = Math.ceil((sub.currentPeriodEnd.getTime() - Date.now()) / DAY_MS)
    daysUntilExpiry = days
    if (days < 0) {
      inGracePeriod = true
      graceLeft = Math.max(0, graceDays + days)
    }
  }

  return apiOk({ ...sub, daysUntilExpiry, inGracePeriod, graceLeft, wasAutoDowngraded })
})

const subscribeSchema = z.object({
  planId:       z.string().uuid(),
  billingCycle: z.enum(['monthly', 'annual']).default('monthly'),
})

export const POST = withAdmin(async (req, { tenantId, admin }) => {
  const body = subscribeSchema.parse(await req.json())
  const plan = await svc.getPlanById(body.planId)
  if (!plan.isFree) throw { code: 'BAD_REQUEST', message: 'Los planes de pago requieren completar el proceso de pago.' }
  const result = await svc.activateSubscription(tenantId, body.planId, body.billingCycle)
  createLog({ tenantId, userId: admin.sub, userName: admin.username, action: 'billing.subscribe', module: 'billing', detail: { planId: body.planId, plan: plan.name, cycle: body.billingCycle }, ip: getClientIp(req) })
  return apiOk(result, 'Suscripción actualizada.')
})

export const DELETE = withAdmin(async (req, { tenantId, admin }) => {
  const sub = await svc.getSubscription(tenantId)
  const result = await svc.cancelSubscription(tenantId)
  createLog({ tenantId, userId: admin.sub, userName: admin.username, action: 'billing.cancel', module: 'billing', detail: { plan: sub?.plan?.name }, ip: getClientIp(req) })
  return apiOk(result, 'Suscripción cancelada al final del período.')
})
