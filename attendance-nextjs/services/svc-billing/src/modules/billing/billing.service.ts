import { prisma } from '@attendance/shared'

const DAY_MS = 24 * 60 * 60 * 1000

// ── Plans ─────────────────────────────────────────────────────────────────────

export async function getPlans() {
  return prisma.plan.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  })
}

export async function getPlanById(id: string) {
  const plan = await prisma.plan.findUnique({ where: { id } })
  if (!plan) throw { code: 'NOT_FOUND', message: 'Plan no encontrado.' }
  return plan
}

async function getDefaultFreePlan() {
  return prisma.plan.findFirst({
    where: { isFree: true, isActive: true },
    orderBy: { sortOrder: 'asc' },
  })
}

// ── Proration ─────────────────────────────────────────────────────────────────

export interface ProrationResult {
  amountCents:    number
  fullPriceCents: number
  creditCents:    number
  free:           boolean
  type:           'renewal' | 'upgrade' | 'cycle-change' | 'downgrade-scheduled' | 'new'
  scheduledAt?:   Date
}

export async function calculateProration(
  tenantId: string,
  newPlanId: string,
  newBillingCycle: 'monthly' | 'annual',
): Promise<ProrationResult> {
  const now = new Date()

  const [newPlan, existing] = await Promise.all([
    getPlanById(newPlanId),
    prisma.subscription.findUnique({ where: { tenantId }, include: { plan: true } }),
  ])

  const newPrice      = newBillingCycle === 'annual'
    ? (newPlan.priceAnnual ?? newPlan.priceMonthly * 12)
    : newPlan.priceMonthly
  const fullPriceCents = Math.round(newPrice * 100)

  if (!existing || existing.plan.isFree) {
    return { amountCents: fullPriceCents, fullPriceCents, creditCents: 0, free: false, type: 'new' }
  }

  const isSamePlan  = existing.planId === newPlanId
  const isSameCycle = existing.billingCycle === newBillingCycle
  const periodEnd   = existing.currentPeriodEnd
  const daysLeft    = periodEnd ? Math.max(0, Math.ceil((periodEnd.getTime() - now.getTime()) / DAY_MS)) : 0
  const totalDays   = existing.billingCycle === 'annual' ? 365 : 30
  const isUpgrade   = newPlan.sortOrder > existing.plan.sortOrder

  if (isSamePlan && isSameCycle) {
    return { amountCents: fullPriceCents, fullPriceCents, creditCents: 0, free: false, type: 'renewal' }
  }

  if (isSamePlan && existing.billingCycle === 'annual' && newBillingCycle === 'monthly' && daysLeft > 0) {
    return { amountCents: 0, fullPriceCents, creditCents: 0, free: false, type: 'downgrade-scheduled', scheduledAt: periodEnd ?? undefined }
  }

  if (!isUpgrade && !isSamePlan && daysLeft > 0) {
    return { amountCents: 0, fullPriceCents, creditCents: 0, free: false, type: 'downgrade-scheduled', scheduledAt: periodEnd ?? undefined }
  }

  const currentPrice = existing.billingCycle === 'annual'
    ? (existing.plan.priceAnnual ?? existing.plan.priceMonthly * 12)
    : existing.plan.priceMonthly
  const creditCents  = daysLeft > 0 ? Math.round((daysLeft / totalDays) * currentPrice * 100) : 0
  const amountCents  = Math.max(0, fullPriceCents - creditCents)
  const type         = isSamePlan ? 'cycle-change' : 'upgrade'

  return { amountCents, fullPriceCents, creditCents, free: amountCents === 0, type }
}

// ── Log helper ────────────────────────────────────────────────────────────────

async function logAction(opts: {
  tenantId:       string
  action:         string
  planId:         string
  previousPlanId?: string | null
  billingCycle:   string
  amountPaid?:    number | null
  creditAmount?:  number | null
}) {
  await prisma.subscriptionLog.create({ data: opts }).catch(e =>
    console.error('[billing] log error', e)
  )
}

// ── Notifications ─────────────────────────────────────────────────────────────

const ACTION_LABELS: Record<string, string> = {
  new:                'Nueva suscripción',
  renewal:            'Renovación de plan',
  upgrade:            'Actualización de plan',
  cycle_change:       'Cambio de ciclo',
  cancelled:          'Suscripción cancelada',
  downgrade_scheduled:'Cambio de plan programado',
  scheduled_downgrade:'Cambio de plan aplicado',
  auto_downgraded:    'Plan reducido automáticamente',
}

async function notifySubscriptionEvent(
  tenantId: string,
  action: string,
  planName: string,
  billingCycle: 'monthly' | 'annual',
  amountPaid?: number | null,
) {
  const cycle  = billingCycle === 'annual' ? 'Anual' : 'Mensual'
  const label  = ACTION_LABELS[action] ?? action
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } })

  const tenantTitle = label
  const tenantBody  = amountPaid != null
    ? `Plan ${planName} (${cycle}) — $${amountPaid.toFixed(2)} USD`
    : `Plan ${planName} (${cycle})`

  const adminTitle = `${label} — ${tenant?.name ?? tenantId}`
  const adminBody  = amountPaid != null
    ? `Plan ${planName} (${cycle}) — $${amountPaid.toFixed(2)} USD`
    : `Plan ${planName} (${cycle})`

  const type = ['cancelled', 'auto_downgraded'].includes(action) ? 'warning'
             : action === 'new' || action === 'upgrade' ? 'success'
             : 'info'

  await prisma.notification.createMany({
    data: [
      { tenantId, forAdmin: false, title: tenantTitle, body: tenantBody, type },
      { tenantId: null,  forAdmin: true,  title: adminTitle,  body: adminBody,  type },
    ],
  })
}

// ── Auto-downgrade on fetch ───────────────────────────────────────────────────

export async function checkAndAutoDowngrade(tenantId: string): Promise<boolean> {
  const sub = await prisma.subscription.findUnique({
    where:   { tenantId },
    include: { plan: true },
  })
  if (!sub || sub.plan.isFree || !sub.currentPeriodEnd) return false
  if (sub.status !== 'active') return false

  const now         = new Date()
  const expiredMs   = now.getTime() - sub.currentPeriodEnd.getTime()
  if (expiredMs <= 0) return false

  const settings  = await prisma.systemSettings.findUnique({ where: { id: 'system' } })
  const graceDays = settings?.gracePeriodDays ?? 3
  const expiredDays = expiredMs / (24 * 60 * 60 * 1000)
  if (expiredDays <= graceDays) return false

  const freePlan = await prisma.plan.findFirst({ where: { isFree: true, isActive: true }, orderBy: { sortOrder: 'asc' } })
  if (!freePlan) return false

  const targetPlanId = sub.scheduledPlanId ?? freePlan.id
  const targetCycle  = (sub.scheduledBillingCycle as 'monthly' | 'annual' | null) ?? 'monthly'
  const action       = sub.scheduledPlanId ? 'scheduled_downgrade' : 'auto_downgraded'

  console.log(`[billing] Auto-downgrade tenant=${tenantId} → plan=${targetPlanId}`)
  await activateSubscription(tenantId, targetPlanId, targetCycle, undefined, {
    action,
    previousPlanId: sub.planId,
  })

  // Notificación específica de vencimiento al tenant y superadmin
  const tenantName = (await prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }))?.name ?? tenantId
  await prisma.notification.createMany({
    data: [
      {
        tenantId,
        forAdmin: false,
        title:    'Suscripción vencida',
        body:     `Tu plan ${sub.plan.name} venció y fue cambiado al plan gratuito. Renueva para recuperar todas las funciones.`,
        type:     'warning',
      },
      {
        tenantId: null,
        forAdmin: true,
        title:    `Suscripción vencida — ${tenantName}`,
        body:     `El plan ${sub.plan.name} fue degradado automáticamente al plan gratuito por vencimiento de período.`,
        type:     'warning',
      },
    ],
  }).catch(e => console.error('[billing] notify auto-downgrade error', e?.message))

  return true
}

// ── Subscription ──────────────────────────────────────────────────────────────

export async function getSubscription(tenantId: string) {
  return prisma.subscription.findUnique({
    where: { tenantId },
    include: { plan: true },
  })
}

export async function activateSubscription(
  tenantId: string,
  planId: string,
  billingCycle: 'monthly' | 'annual',
  periodDays?: number,
  logOpts?: { action: string; previousPlanId?: string | null; amountPaid?: number; creditAmount?: number },
) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
  if (!tenant) throw { code: 'NOT_FOUND', message: 'Tenant no encontrado.' }

  const plan    = await getPlanById(planId)
  const now     = new Date()
  const days    = periodDays ?? (billingCycle === 'annual' ? 365 : 30)
  const existing = await prisma.subscription.findUnique({ where: { tenantId } })

  const isSameRenewal =
    existing?.planId === planId &&
    existing?.billingCycle === billingCycle &&
    existing?.currentPeriodEnd &&
    existing.currentPeriodEnd.getTime() > now.getTime()

  const baseDate  = isSameRenewal ? existing!.currentPeriodEnd! : now
  const periodEnd = new Date(baseDate.getTime() + days * DAY_MS)

  const data = {
    planId,
    billingCycle,
    status:               'active' as const,
    stripeSubscriptionId: null,
    stripePriceId:        null,
    currentPeriodStart:   now,
    currentPeriodEnd:     plan.isFree ? null : periodEnd,
    cancelAtPeriodEnd:    false,
    canceledAt:           null,
    scheduledPlanId:      null,
    scheduledBillingCycle: null,
    notif7SentAt:         null,
    notif3SentAt:         null,
    notif1SentAt:         null,
    notifGraceAt:         null,
    expiryRemindersSent:  '[]',
    // Preserve lastPaidPeriodEnd when downgrading; clear it when renewing a paid plan
    ...(plan.isFree
      ? { lastPaidPeriodEnd: existing?.currentPeriodEnd ?? existing?.lastPaidPeriodEnd ?? null }
      : { lastPaidPeriodEnd: null }),
  }

  const sub = existing
    ? await prisma.subscription.update({ where: { tenantId }, data, include: { plan: true } })
    : await prisma.subscription.create({ data: { tenantId, ...data }, include: { plan: true } })

  const action = logOpts?.action ?? (existing ? 'renewal' : 'new')
  await logAction({
    tenantId,
    action,
    planId,
    previousPlanId: logOpts?.previousPlanId ?? existing?.planId ?? null,
    billingCycle,
    amountPaid:  logOpts?.amountPaid  ?? null,
    creditAmount: logOpts?.creditAmount ?? null,
  })

  // No notificar cuando la cancelación activa el plan gratuito (ya se notifica en cancelSubscription)
  if (action !== 'cancelled') {
    notifySubscriptionEvent(tenantId, action, plan.name, billingCycle, logOpts?.amountPaid).catch(
      e => console.error('[billing] notify error', e?.message)
    )
  }

  return sub
}

export async function scheduleDowngrade(
  tenantId: string,
  planId: string,
  billingCycle: 'monthly' | 'annual',
) {
  const sub = await prisma.subscription.findUnique({ where: { tenantId } })
  if (!sub) throw { code: 'NOT_FOUND', message: 'No hay suscripción activa.' }

  const newPlan = await getPlanById(planId)

  await logAction({
    tenantId,
    action:        'downgrade_scheduled',
    planId,
    previousPlanId: sub.planId,
    billingCycle,
  })

  notifySubscriptionEvent(tenantId, 'downgrade_scheduled', newPlan.name, billingCycle).catch(
    e => console.error('[billing] notify error', e?.message)
  )

  return prisma.subscription.update({
    where: { tenantId },
    data: { scheduledPlanId: planId, scheduledBillingCycle: billingCycle },
    include: { plan: true },
  })
}

export async function cancelSubscription(tenantId: string) {
  const sub = await prisma.subscription.findUnique({ where: { tenantId }, include: { plan: true } })
  if (!sub) throw { code: 'NOT_FOUND', message: 'No hay suscripción activa.' }

  const freePlan = await getDefaultFreePlan()
  if (!freePlan) throw { code: 'INTERNAL', message: 'No hay plan gratuito configurado.' }

  const result = await activateSubscription(tenantId, freePlan.id, 'monthly', undefined, {
    action:         'cancelled',
    previousPlanId: sub.planId,
  })

  notifySubscriptionEvent(tenantId, 'cancelled', sub.plan.name, sub.billingCycle).catch(
    e => console.error('[billing] notify error', e?.message)
  )

  return result
}

// ── Invoices ──────────────────────────────────────────────────────────────────

export async function getInvoices(tenantId: string, page = 1, pageSize = 10) {
  const [items, total] = await Promise.all([
    prisma.invoice.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.invoice.count({ where: { tenantId } }),
  ])
  return { items, total, page, pageSize }
}

// ── Subscription Log ──────────────────────────────────────────────────────────

export async function getSubscriptionLog(tenantId: string, page = 1, pageSize = 20) {
  const [items, total] = await Promise.all([
    prisma.subscriptionLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { plan: { select: { name: true } } },
    }),
    prisma.subscriptionLog.count({ where: { tenantId } }),
  ])
  return { items, total, page, pageSize }
}
