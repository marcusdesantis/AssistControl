import { prisma } from '@attendance/shared'
import { confirmPayment } from '@/modules/payment/payphone.service'
import { activateSubscription } from '@/modules/billing/billing.service'

export async function GET(req: Request) {
  const url                  = new URL(req.url)
  const id                   = parseInt(url.searchParams.get('id') ?? '0', 10)
  const clientTransactionId  = url.searchParams.get('clientTransactionId') ?? ''
  const frontendUrl          = process.env.FRONTEND_URL ?? 'http://localhost:5173'
  const base                 = `${frontendUrl}/settings?tab=subscription`

  try {
    const event = await prisma.paymentEvent.findUnique({ where: { stripeEventId: clientTransactionId } })
    if (!event || event.type !== 'payphone.pending') {
      return Response.redirect(`${base}&status=error`, 302)
    }

    const result = await confirmPayment(id, clientTransactionId)
    if (result.statusCode !== 3) {
      return Response.redirect(`${base}&status=cancelled`, 302)
    }

    const { tenantId, planId, billingCycle, amountCents } = event.payload as any

    await activateSubscription(tenantId, planId, billingCycle)

    await prisma.invoice.create({
      data: {
        tenantId,
        stripeInvoiceId: null,
        amount:          amountCents / 100,
        currency:        'USD',
        status:          'paid',
        billingCycle,
        paidAt:          new Date(),
      },
    })

    await prisma.paymentEvent.update({
      where: { stripeEventId: clientTransactionId },
      data:  { type: 'payphone.completed' },
    })

    return Response.redirect(`${base}&status=paid`, 302)
  } catch (e) {
    console.error('[payphone/callback]', e)
    return Response.redirect(`${base}&status=error`, 302)
  }
}
