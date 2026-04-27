import { withAdmin, apiOk, prisma } from '@attendance/shared'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { getPlanById, calculateProration, activateSubscription, scheduleDowngrade } from '@/modules/billing/billing.service'

const schema = z.object({
  planId:       z.string().uuid(),
  billingCycle: z.enum(['monthly', 'annual']),
})

export const POST = withAdmin(async (req, { tenantId }) => {
  const { planId, billingCycle } = schema.parse(await req.json())

  const plan = await getPlanById(planId)
  if (plan.isFree) throw { code: 'BAD_REQUEST', message: 'Los planes gratuitos no requieren pago.' }

  const proration = await calculateProration(tenantId, planId, billingCycle)

  // Downgrade programado — no se cobra, solo se agenda
  if (proration.type === 'downgrade-scheduled') {
    await scheduleDowngrade(tenantId, planId, billingCycle)
    return apiOk({ scheduled: true, scheduledAt: proration.scheduledAt })
  }

  // Upgrade/cambio de ciclo gratuito (crédito cubre el total)
  if (proration.free) {
    const sub = await activateSubscription(tenantId, planId, billingCycle)
    return apiOk({ free: true, subscription: sub, fullPriceCents: proration.fullPriceCents, creditCents: proration.creditCents })
  }

  // Pago requerido → crear evento pendiente y retornar params para Payphone
  const clientTransactionId = `pp_${randomUUID().replace(/-/g, '')}`

  await prisma.paymentEvent.create({
    data: {
      stripeEventId: clientTransactionId,
      type:          'payphone.pending',
      payload:       {
        tenantId, planId, billingCycle,
        amountCents:    proration.amountCents,
        fullPriceCents: proration.fullPriceCents,
        creditCents:    proration.creditCents,
      } as any,
    },
  })

  const appUrl      = process.env.APP_URL      ?? 'http://localhost:80'
  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173'

  const cycleLabel = billingCycle === 'annual' ? 'Anual' : 'Mensual'

  return apiOk({
    clientTransactionId,
    amountCents:    proration.amountCents,
    fullPriceCents: proration.fullPriceCents,
    creditCents:    proration.creditCents,
    storeId:        process.env.PAYPHONE_STORE_ID ?? '',
    token:          process.env.PAYPHONE_TOKEN    ?? '',
    reference:      `${plan.name} - ${cycleLabel}`,
    responseUrl:    `${appUrl}/api/v1/payment/confirm`,
    cancellationUrl:`${frontendUrl}/settings?tab=subscription&status=cancelled`,
  })
})
