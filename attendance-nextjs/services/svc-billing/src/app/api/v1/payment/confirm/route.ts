import { prisma } from '@attendance/shared'
import { confirmPayment } from '@/modules/payment/payphone.service'
import { activateSubscription } from '@/modules/billing/billing.service'

export async function GET(req: Request) {
  const url                 = new URL(req.url)
  const id                  = url.searchParams.get('id') ?? '0'
  const clientTransactionId = url.searchParams.get('clientTransactionId') ?? ''
  const frontendUrl         = process.env.FRONTEND_URL ?? 'http://localhost:5173'
  const base                = `${frontendUrl}/settings?tab=subscription`

  try {
    const event = await prisma.paymentEvent.findUnique({ where: { stripeEventId: clientTransactionId } })
    if (!event || event.type !== 'payphone.pending') {
      return Response.redirect(`${base}&status=error`, 302)
    }

    // 1. Verificar con Payphone ANTES de activar nada.
    let result
    try {
      result = await confirmPayment(id, clientTransactionId)
      console.log('[payphone/confirm] respuesta Payphone:', JSON.stringify(result))
    } catch (confirmErr: any) {
      console.error('[payphone/confirm] error al contactar Payphone:', confirmErr?.message ?? confirmErr)
      await prisma.paymentEvent.update({
        where: { stripeEventId: clientTransactionId },
        data:  {
          type:    'payphone.error',
          payload: { ...(event.payload as any), confirmError: confirmErr?.message ?? String(confirmErr) } as any,
        },
      })
      return Response.redirect(`${base}&status=error`, 302)
    }

    // 2. Si Payphone no aprobó (statusCode 3 = aprobado), rechazar sin activar.
    if (result.statusCode !== 3) {
      console.warn('[payphone/confirm] pago no aprobado — statusCode=%s transactionStatus=%s message=%s',
        result.statusCode, result.transactionStatus, result.message)
      await prisma.paymentEvent.update({
        where: { stripeEventId: clientTransactionId },
        data:  {
          type:    'payphone.rejected',
          payload: { ...(event.payload as any), payphoneResponse: result } as any,
        },
      })
      return Response.redirect(`${base}&status=cancelled`, 302)
    }

    // 3. Pago aprobado — activar suscripción.
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
      data:  {
        type:    'payphone.completed',
        payload: { ...(event.payload as any), payphoneResponse: result } as any,
      },
    })

    return Response.redirect(`${base}&status=paid`, 302)
  } catch (e: any) {
    console.error('[payphone/confirm] error inesperado:', e?.message ?? e)
    return Response.redirect(`${base}&status=error`, 302)
  }
}
