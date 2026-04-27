import { prisma } from '@attendance/shared'
import { confirmPayment } from '@/modules/payment/payphone.service'
import { activateSubscription } from '@/modules/billing/billing.service'

export async function GET(req: Request) {
  const url                 = new URL(req.url)
  const id                  = parseInt(url.searchParams.get('id') ?? '0', 10)
  const clientTransactionId = url.searchParams.get('clientTransactionId') ?? ''
  const frontendUrl         = process.env.FRONTEND_URL ?? 'http://localhost:5173'
  const base                = `${frontendUrl}/settings?tab=subscription`

  try {
    const event = await prisma.paymentEvent.findUnique({ where: { stripeEventId: clientTransactionId } })
    if (!event || event.type !== 'payphone.pending') {
      return Response.redirect(`${base}&status=error`, 302)
    }

    const { tenantId, planId, billingCycle, amountCents, fullPriceCents, creditCents } = event.payload as any

    const existing = await prisma.subscription.findUnique({ where: { tenantId }, include: { plan: true } })
    const previousPlanId = existing?.planId ?? null
    const isSamePlan     = existing?.planId === planId
    const isSameCycle    = existing?.billingCycle === billingCycle
    const action = !existing || existing.plan?.isFree
      ? 'new'
      : isSamePlan && isSameCycle ? 'renewal'
      : isSamePlan ? 'cycle_change'
      : 'upgrade'

    const plan = await prisma.plan.findUnique({ where: { id: planId } })

    await activateSubscription(tenantId, planId, billingCycle, undefined, {
      action,
      previousPlanId,
      amountPaid:   amountCents   ? amountCents / 100   : undefined,
      creditAmount: creditCents   ? creditCents / 100   : undefined,
    })

    // Número de comprobante secuencial global
    const invoiceCount  = await prisma.invoice.count()
    const invoiceNumber = `COMP-${String(invoiceCount + 1).padStart(6, '0')}`

    const sub = await prisma.subscription.findUnique({ where: { tenantId } })

    await prisma.invoice.create({
      data: {
        tenantId,
        stripeInvoiceId: null,
        invoiceNumber,
        planName:    plan?.name ?? null,
        amount:      amountCents / 100,
        currency:    'USD',
        status:      'paid',
        billingCycle,
        periodStart: sub?.currentPeriodStart ?? new Date(),
        periodEnd:   sub?.currentPeriodEnd   ?? null,
        paidAt:      new Date(),
      },
    })

    await prisma.paymentEvent.update({
      where: { stripeEventId: clientTransactionId },
      data:  { type: 'payphone.completed' },
    })

    // Verificar con Payphone en background sin bloquear al usuario.
    // Si el pago no está aprobado, revertimos la suscripción.
    confirmPayment(id, clientTransactionId)
      .then(async r => {
        if (r.statusCode !== 3) {
          console.warn('[payphone/confirm] pago no aprobado (statusCode=%s) — revirtiendo suscripción tenantId=%s', r.statusCode, tenantId)
          await prisma.subscription.updateMany({
            where: { tenantId },
            data:  { status: 'canceled' },
          })
          await prisma.paymentEvent.update({
            where: { stripeEventId: clientTransactionId },
            data:  { type: 'payphone.rejected' },
          })
        } else {
          console.log('[payphone/confirm] background confirm OK authCode=%s', r.authorizationCode)
        }
      })
      .catch(e => console.error('[payphone/confirm] background confirm falló — revisar manualmente id=%s', id, e?.message ?? e))

    return Response.redirect(`${base}&status=paid`, 302)
  } catch (e: any) {
    console.error('[payphone/confirm] error activando suscripción:', e?.message ?? e)
    return Response.redirect(`${base}&status=error`, 302)
  }
}
