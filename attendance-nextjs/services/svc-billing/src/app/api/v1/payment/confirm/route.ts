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

    // Verificar con Payphone ANTES de activar nada.
    // statusCode 3 = Aprobado; cualquier otro valor = Cancelado/Rechazado.
    const result = await confirmPayment(id, clientTransactionId)
    if (result.statusCode !== 3) {
      console.warn('[payphone/confirm] pago no aprobado (statusCode=%s) clientTransactionId=%s', result.statusCode, clientTransactionId)
      await prisma.paymentEvent.update({
        where: { stripeEventId: clientTransactionId },
        data:  { type: 'payphone.rejected' },
      })
      return Response.redirect(`${base}&status=cancelled`, 302)
    }

    const { tenantId, planId, billingCycle, amountCents, creditCents } = event.payload as any

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
      amountPaid:   amountCents ? amountCents / 100 : undefined,
      creditAmount: creditCents ? creditCents / 100 : undefined,
    })

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

    return Response.redirect(`${base}&status=paid`, 302)
  } catch (e: any) {
    console.error('[payphone/confirm] error:', e?.message ?? e)
    return Response.redirect(`${base}&status=error`, 302)
  }
}
