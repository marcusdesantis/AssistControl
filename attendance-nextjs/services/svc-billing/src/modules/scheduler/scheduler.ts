import { prisma, sendEmail } from '@attendance/shared'
import { activateSubscription } from '@/modules/billing/billing.service'

const DAY_MS = 24 * 60 * 60 * 1000

function daysUntil(date: Date): number {
  return Math.ceil((date.getTime() - Date.now()) / DAY_MS)
}

async function getAdminEmail(tenantId: string): Promise<string | null> {
  const user = await prisma.user.findFirst({
    where: { tenantId, isDeleted: false },
    orderBy: { createdAt: 'asc' },
    select: { email: true },
  })
  return user?.email ?? null
}

async function getDefaultFreePlan() {
  return prisma.plan.findFirst({
    where: { isFree: true, isActive: true },
    orderBy: { sortOrder: 'asc' },
  })
}

async function getCompanyEmail(tenantId: string): Promise<string | null> {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { email: true } })
  return tenant?.email ?? null
}

async function sendExpiryReminder(
  tenantId: string,
  tenantName: string,
  planName: string,
  daysSince: number,
  target: string,
  settings: { smtpEnabled: boolean },
) {
  if (!settings.smtpEnabled) return
  const [adminEmail, companyEmail] = await Promise.all([
    getAdminEmail(tenantId),
    getCompanyEmail(tenantId),
  ])
  const recipients: string[] = []
  if ((target === 'admin' || target === 'both') && adminEmail)   recipients.push(adminEmail)
  if ((target === 'company' || target === 'both') && companyEmail && companyEmail !== adminEmail) recipients.push(companyEmail)
  if (recipients.length === 0) return

  const html = expiryReminderHtml(tenantName, planName, daysSince)
  const subject = daysSince === 1
    ? '⚠️ Tu suscripción venció hace 1 día — renueva ahora'
    : `⚠️ Tu suscripción venció hace ${daysSince} días — renueva ahora`

  for (const to of recipients) {
    await sendEmail(tenantId, { to, subject, html }).catch(e =>
      console.error(`[scheduler] expiry-reminder email error (day=${daysSince}) tenant=${tenantId}`, e)
    )
  }
}

async function runExpiryReminders(settings: Awaited<ReturnType<typeof prisma.systemSettings.findUnique>>) {
  if (!settings?.expiryReminderEnabled) return

  const reminderDays: number[] = JSON.parse(settings.expiryReminderDays ?? '[1,2,7,15,30]')
  const maxDay = Math.max(...reminderDays, 0)
  const target = settings.expiryReminderTarget ?? 'admin'
  const now = new Date()
  const cutoff = new Date(now.getTime() - maxDay * 24 * 60 * 60 * 1000)

  // Suscripciones degradadas al plan gratuito cuyo plan de pago venció recientemente y no han renovado
  const downgradedSubs = await prisma.subscription.findMany({
    where: {
      plan: { isFree: true },
      lastPaidPeriodEnd: { not: null, gte: cutoff },
    },
    include: {
      tenant: { select: { id: true, name: true } },
      plan:   { select: { name: true } },
    },
  })

  // Suscripciones en plan de pago vencidas y aún en período de gracia (sin renovar)
  const expiredPaidSubs = await prisma.subscription.findMany({
    where: {
      status: 'active',
      plan:   { isFree: false },
      currentPeriodEnd: { not: null, lt: now },
    },
    include: {
      tenant: { select: { id: true, name: true } },
      plan:   { select: { name: true } },
    },
  })

  const allSubs = [...downgradedSubs, ...expiredPaidSubs]

  for (const sub of allSubs) {
    const expiryDate = sub.lastPaidPeriodEnd ?? sub.currentPeriodEnd
    if (!expiryDate) continue

    const daysSince = Math.floor((now.getTime() - expiryDate.getTime()) / (24 * 60 * 60 * 1000))
    if (daysSince <= 0 || daysSince > maxDay) continue

    const sent: number[] = JSON.parse(sub.expiryRemindersSent ?? '[]')
    const pending = reminderDays.filter(d => d <= daysSince && !sent.includes(d))
    if (pending.length === 0) continue

    const latestDay = Math.max(...pending)
    console.log(`[scheduler] expiry-reminder day=${latestDay} tenant=${sub.tenantId}`)
    await sendExpiryReminder(sub.tenantId, sub.tenant.name, sub.plan.name, daysSince, target, { smtpEnabled: settings.smtpEnabled })

    const newSent = JSON.stringify([...sent, ...pending])
    await prisma.subscription.update({
      where: { tenantId: sub.tenantId },
      data:  { expiryRemindersSent: newSent },
    })
  }
}

async function runDailyCheck() {
  console.log('[scheduler] Iniciando verificación diaria de suscripciones...')

  const settings = await prisma.systemSettings.findUnique({ where: { id: 'system' } })
  const graceDays = settings?.gracePeriodDays ?? 3

  const now = new Date()

  // Suscripciones activas con fecha de vencimiento definida
  const subs = await prisma.subscription.findMany({
    where: {
      status:          'active',
      currentPeriodEnd: { not: null },
      plan:            { isFree: false },
    },
    include: {
      tenant: { select: { id: true, name: true } },
      plan:   { select: { name: true } },
    },
  })

  const freePlan = await getDefaultFreePlan()

  for (const sub of subs) {
    const periodEnd = sub.currentPeriodEnd!
    const days      = daysUntil(periodEnd)
    const tenantId  = sub.tenantId
    const email     = await getAdminEmail(tenantId)
    const tenantName = sub.tenant.name
    const planName   = sub.plan.name
    const endStr     = periodEnd.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

    // ── Notificación 7 días ────────────────────────────────────────────────────
    if (days <= 7 && days > 3 && !sub.notif7SentAt) {
      console.log(`[scheduler] Enviando aviso 7 días a tenant=${tenantId}`)
      if (email && settings?.smtpEnabled) {
        await sendEmail(tenantId, {
          to:      email,
          subject: `Tu suscripción vence en ${days} días`,
          html:    emailHtml(tenantName, planName, endStr, days, null),
        }).catch(e => console.error('[scheduler] email 7d error', e))
      }
      await prisma.subscription.update({
        where: { tenantId },
        data:  { notif7SentAt: now },
      })
    }

    // ── Notificación 3 días ────────────────────────────────────────────────────
    if (days <= 3 && days > 1 && !sub.notif3SentAt) {
      console.log(`[scheduler] Enviando aviso 3 días a tenant=${tenantId}`)
      if (email && settings?.smtpEnabled) {
        await sendEmail(tenantId, {
          to:      email,
          subject: `⚠️ Solo quedan ${days} días para que venza tu suscripción`,
          html:    emailHtml(tenantName, planName, endStr, days, null),
        }).catch(e => console.error('[scheduler] email 3d error', e))
      }
      await prisma.subscription.update({
        where: { tenantId },
        data:  { notif3SentAt: now },
      })
    }

    // ── Notificación 1 día ─────────────────────────────────────────────────────
    if (days <= 1 && days >= 0 && !sub.notif1SentAt) {
      console.log(`[scheduler] Enviando aviso 1 día a tenant=${tenantId}`)
      if (email && settings?.smtpEnabled) {
        await sendEmail(tenantId, {
          to:      email,
          subject: days === 0
            ? '🚨 Tu suscripción vence hoy'
            : '⚠️ Tu suscripción vence mañana',
          html: emailHtml(tenantName, planName, endStr, days, null),
        }).catch(e => console.error('[scheduler] email 1d error', e))
      }
      await prisma.subscription.update({
        where: { tenantId },
        data:  { notif1SentAt: now },
      })
    }

    // ── Período de gracia / Downgrade ──────────────────────────────────────────
    if (days < 0) {
      const expiredDays  = Math.abs(days)
      const graceLeft    = graceDays - expiredDays

      // Aviso de gracia (una sola vez)
      if (!sub.notifGraceAt && graceLeft > 0) {
        console.log(`[scheduler] Enviando aviso de gracia a tenant=${tenantId} (${graceLeft}d restantes)`)
        if (email && settings?.smtpEnabled) {
          await sendEmail(tenantId, {
            to:      email,
            subject: `Tu suscripción venció — tienes ${graceLeft} día${graceLeft !== 1 ? 's' : ''} de gracia`,
            html:    emailHtml(tenantName, planName, endStr, days, graceLeft),
          }).catch(e => console.error('[scheduler] email gracia error', e))
        }
        await prisma.subscription.update({
          where: { tenantId },
          data:  { notifGraceAt: now },
        })
      }

      // Downgrade al vencer: plan programado o plan gratuito
      if (graceLeft <= 0) {
        const targetPlanId    = sub.scheduledPlanId    ?? freePlan?.id
        const targetCycle     = (sub.scheduledBillingCycle as 'monthly' | 'annual' | null) ?? 'monthly'
        const targetPlanName  = sub.scheduledPlanId
          ? (await prisma.plan.findUnique({ where: { id: sub.scheduledPlanId }, select: { name: true } }))?.name ?? 'plan seleccionado'
          : freePlan?.name ?? 'plan gratuito'

        if (targetPlanId) {
          console.log(`[scheduler] Downgrade a plan="${targetPlanId}" cycle="${targetCycle}": tenant=${tenantId}`)
          await activateSubscription(tenantId, targetPlanId, targetCycle, undefined, {
            action:         sub.scheduledPlanId ? 'scheduled_downgrade' : 'auto_downgraded',
            previousPlanId: sub.planId,
          })
          if (email && settings?.smtpEnabled) {
            await sendEmail(tenantId, {
              to:      email,
              subject: `Tu suscripción ha sido cambiada a ${targetPlanName}`,
              html:    downgradeEmailHtml(tenantName, planName, targetPlanName),
            }).catch(e => console.error('[scheduler] email downgrade error', e))
          }
        }
      }
    }
  }

  // ── Recordatorios de vencimiento post-expiración ──────────────────────────
  await runExpiryReminders(settings).catch(e =>
    console.error('[scheduler] error en expiry reminders:', e)
  )

  console.log('[scheduler] Verificación completada.')
}

// ── Templates de email ────────────────────────────────────────────────────────

function emailHtml(tenantName: string, planName: string, endStr: string, days: number, graceLeft: number | null) {
  const isGrace   = graceLeft !== null
  const isExpired = days < 0
  const color     = isGrace ? '#dc2626' : days <= 1 ? '#f97316' : '#f59e0b'

  const title = isGrace
    ? `Tu suscripción ha vencido`
    : days === 0 ? 'Tu suscripción vence hoy'
    : days === 1 ? 'Tu suscripción vence mañana'
    : `Tu suscripción vence en ${days} días`

  const body = isGrace
    ? `Tienes <strong>${graceLeft} día${graceLeft !== 1 ? 's' : ''}</strong> de gracia antes de ser bajado al plan gratuito.`
    : `Tu plan <strong>${planName}</strong> vence el <strong>${endStr}</strong>. Renueva para continuar sin interrupciones.`

  return `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <div style="background:${color};border-radius:8px 8px 0 0;padding:20px 24px">
        <h2 style="color:#fff;margin:0;font-size:18px">${title}</h2>
      </div>
      <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:24px">
        <p style="color:#374151">Hola <strong>${tenantName}</strong>,</p>
        <p style="color:#374151">${body}</p>
        <a href="${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/settings?tab=subscription"
           style="display:inline-block;background:#1e40af;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:8px">
          Renovar suscripción
        </a>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">TiempoYa · Sistema de Gestión de Asistencia</p>
      </div>
    </div>
  `
}

function expiryReminderHtml(tenantName: string, planName: string, daysSince: number) {
  const urgency = daysSince >= 15 ? '#dc2626' : daysSince >= 7 ? '#ea580c' : '#f59e0b'
  return `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <div style="background:${urgency};border-radius:8px 8px 0 0;padding:20px 24px">
        <h2 style="color:#fff;margin:0;font-size:18px">Tu plan venció hace ${daysSince} día${daysSince !== 1 ? 's' : ''}</h2>
      </div>
      <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:24px">
        <p style="color:#374151">Hola <strong>${tenantName}</strong>,</p>
        <p style="color:#374151">Tu suscripción al plan <strong>${planName}</strong> venció hace <strong>${daysSince} día${daysSince !== 1 ? 's' : ''}</strong> y aún no has renovado.</p>
        <p style="color:#374151">Renueva ahora para recuperar todas las funciones de tu plataforma de asistencia.</p>
        <a href="${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/settings?tab=subscription"
           style="display:inline-block;background:#1e40af;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:8px">
          Renovar mi suscripción
        </a>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">TiempoYa · Sistema de Gestión de Asistencia</p>
      </div>
    </div>
  `
}

function downgradeEmailHtml(tenantName: string, oldPlan: string, freePlan: string) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <div style="background:#6b7280;border-radius:8px 8px 0 0;padding:20px 24px">
        <h2 style="color:#fff;margin:0;font-size:18px">Suscripción bajada al plan gratuito</h2>
      </div>
      <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:24px">
        <p style="color:#374151">Hola <strong>${tenantName}</strong>,</p>
        <p style="color:#374151">Tu suscripción al plan <strong>${oldPlan}</strong> ha vencido y ha sido cambiada automáticamente al plan <strong>${freePlan}</strong>.</p>
        <p style="color:#374151">Tus datos están seguros. Puedes renovar en cualquier momento.</p>
        <a href="${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/settings?tab=subscription"
           style="display:inline-block;background:#1e40af;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:8px">
          Ver planes
        </a>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">TiempoYa · Sistema de Gestión de Asistencia</p>
      </div>
    </div>
  `
}

// ── Inicio del scheduler ──────────────────────────────────────────────────────

export function startScheduler() {
  console.log('[scheduler] Iniciado — verificación diaria a las 8:00 AM')

  function scheduleNext() {
    const now  = new Date()
    const next = new Date(now)
    next.setHours(8, 0, 0, 0)
    if (next <= now) next.setDate(next.getDate() + 1)
    const ms = next.getTime() - now.getTime()
    console.log(`[scheduler] Próxima ejecución en ${Math.round(ms / 60000)} minutos`)
    setTimeout(async () => {
      await runDailyCheck().catch(e => console.error('[scheduler] error en check:', e))
      scheduleNext()
    }, ms)
  }

  scheduleNext()
}
