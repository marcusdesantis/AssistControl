import { prisma, hashPassword, createNotificationWithPush } from '@attendance/shared'
import { v4 as uuidv4 } from 'uuid'
import nodemailer from 'nodemailer'

// ─── System email (usa SMTP del sistema, no del tenant) ───────────────────────

async function sendSystemEmail(toOrOpts: string | { to?: string; subject: string; html: string }, subject?: string, html?: string) {
  const settings = await prisma.systemSettings.findUnique({ where: { id: 'system' } })
  if (!settings?.smtpEnabled || !settings.smtpHost || !settings.smtpUsername || !settings.smtpPassword) return
  const opts = typeof toOrOpts === 'string'
    ? { to: toOrOpts, subject: subject!, html: html! }
    : toOrOpts
  const recipient = opts.to ?? settings.supportEmail
  if (!recipient) return
  const secure = settings.smtpPort === 465
  const transporter = nodemailer.createTransport({
    host: settings.smtpHost, port: settings.smtpPort, secure,
    auth: { user: settings.smtpUsername, pass: settings.smtpPassword },
  })
  await transporter.sendMail({
    from: `"${settings.smtpFromName ?? 'TiempoYa'}" <${settings.smtpUsername}>`,
    to: recipient, subject: opts.subject, html: opts.html,
  }).catch(e => console.error('[sendSystemEmail]', e))
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function findSuperadminByEmail(email: string) {
  return prisma.superadminAccount.findUnique({ where: { email: email.toLowerCase() } })
}

export async function updateLastLogin(id: string) {
  return prisma.superadminAccount.update({
    where: { id },
    data: { lastLoginAt: new Date() },
  })
}

// ─── Tenants ──────────────────────────────────────────────────────────────────

export async function createTenant(data: {
  companyName: string
  timeZone:    string
  country:     string
  username:    string
  email:       string
  password:    string
  planId?:     string
}) {
  const existingUser = await prisma.user.findFirst({ where: { username: data.username.toLowerCase() } })
  if (existingUser) throw { code: 'USERNAME_TAKEN', message: 'El nombre de usuario ya está en uso.' }

  const existingEmail = await prisma.user.findFirst({ where: { email: data.email.toLowerCase() } })
  if (existingEmail) throw { code: 'EMAIL_TAKEN', message: 'El correo ya está registrado.' }

  const existingCompany = await prisma.tenant.findFirst({ where: { name: { equals: data.companyName.trim(), mode: 'insensitive' }, isDeleted: false } })
  if (existingCompany) throw { code: 'COMPANY_NAME_TAKEN', message: 'Ya existe una empresa con ese nombre.' }

  let planId = data.planId
  if (!planId) {
    const defaultPlan = await prisma.plan.findFirst({ where: { isDefault: true } })
    if (!defaultPlan) throw { code: 'NO_DEFAULT_PLAN', message: 'No hay un plan por defecto configurado.' }
    planId = defaultPlan.id
  }

  const tenant = await prisma.tenant.create({
    data: { name: data.companyName.trim(), timeZone: data.timeZone, country: data.country, checkerKey: uuidv4() },
  })

  await prisma.user.create({
    data: {
      tenantId:     tenant.id,
      username:     data.username.toLowerCase().trim(),
      email:        data.email.toLowerCase().trim(),
      passwordHash: hashPassword(data.password),
      role:         'Admin',
    },
  })

  await prisma.subscription.create({
    data: { tenantId: tenant.id, planId, billingCycle: 'monthly', status: 'active' },
  })

  return { id: tenant.id, name: tenant.name, timeZone: tenant.timeZone, createdAt: tenant.createdAt }
}

export async function listTenants(page: number, pageSize: number, search?: string, planId?: string) {
  const where: any = {}
  if (search)  where.OR = [{ name: { contains: search, mode: 'insensitive' as const } }, { legalName: { contains: search, mode: 'insensitive' as const } }]
  if (planId)  where.subscription = { planId }

  const [items, total] = await Promise.all([
    prisma.tenant.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, legalName: true, country: true,
        timeZone: true, isActive: true, isDeleted: true, createdAt: true,
        selfRegistered: true, pendingApproval: true,
        subscription: { select: { status: true, plan: { select: { name: true } }, currentPeriodEnd: true } },
        _count: { select: { employees: true } },
      },
    }),
    prisma.tenant.count({ where }),
  ])

  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
}

export async function getTenantDetail(id: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id },
    select: {
      id: true, name: true, legalName: true, taxId: true, businessLicense: true,
      country: true, timeZone: true, logoUrl: true, isActive: true, isDeleted: true, createdAt: true,
      street: true, betweenStreets: true, city: true, postalCode: true, state: true,
      phone1: true, phone2: true, fax: true, email: true, website: true,
      selfRegistered: true, pendingApproval: true,
      subscription: {
        select: {
          status: true, billingCycle: true, currentPeriodStart: true, currentPeriodEnd: true,
          cancelAtPeriodEnd: true, plan: { select: { id: true, name: true, priceMonthly: true } },
        },
      },
      invoices: { take: 5, orderBy: { createdAt: 'desc' }, select: { id: true, amount: true, currency: true, status: true, createdAt: true } },
      users: { where: { isDeleted: false }, orderBy: { createdAt: 'asc' }, select: { id: true, username: true, email: true, role: true, isActive: true, lastLoginAt: true } },
      _count: { select: { employees: true, users: true } },
    },
  })
  if (!tenant) throw { code: 'NOT_FOUND', message: 'Tenant no encontrado.' }
  return tenant
}

export async function toggleTenantActive(id: string) {
  const tenant = await prisma.tenant.findUnique({ where: { id }, select: { isActive: true } })
  if (!tenant) throw { code: 'NOT_FOUND', message: 'Tenant no encontrado.' }
  return prisma.tenant.update({ where: { id }, data: { isActive: !tenant.isActive } })
}

export async function updateTenant(id: string, data: {
  name?: string; legalName?: string; country?: string; timeZone?: string
  taxId?: string; businessLicense?: string; street?: string; betweenStreets?: string
  city?: string; postalCode?: string; state?: string
  phone1?: string; phone2?: string; fax?: string; email?: string; website?: string
}) {
  const tenant = await prisma.tenant.findUnique({ where: { id } })
  if (!tenant) throw { code: 'NOT_FOUND', message: 'Tenant no encontrado.' }

  if (data.name && data.name !== tenant.name) {
    const existing = await prisma.tenant.findFirst({ where: { name: { equals: data.name, mode: 'insensitive' }, isDeleted: false, NOT: { id } } })
    if (existing) throw { code: 'COMPANY_NAME_TAKEN', message: 'Ya existe una empresa con ese nombre.' }
  }

  return prisma.tenant.update({ where: { id }, data })
}

export async function deleteTenant(id: string) {
  const tenant = await prisma.tenant.findUnique({ where: { id } })
  if (!tenant) throw { code: 'NOT_FOUND', message: 'Empresa no encontrada.' }

  // 1. RefreshTokens (a través de Users)
  const userIds = (await prisma.user.findMany({ where: { tenantId: id }, select: { id: true } })).map(u => u.id)
  if (userIds.length) await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } })

  // 2. Dependientes de Employee
  await prisma.attendanceRecord.deleteMany({ where: { tenantId: id } })
  await prisma.employeeMessage.deleteMany({ where: { tenantId: id } })
  await prisma.checkerOtp.deleteMany({ where: { tenantId: id } })

  // 3. Invitaciones
  await prisma.employeeInvitation.deleteMany({ where: { tenantId: id } })

  // 4. Empleados
  await prisma.employee.deleteMany({ where: { tenantId: id } })

  // 5. Billing
  await prisma.subscriptionLog.deleteMany({ where: { tenantId: id } })
  await prisma.subscription.deleteMany({ where: { tenantId: id } })
  await prisma.invoice.deleteMany({ where: { tenantId: id } })
  await prisma.paymentMethod.deleteMany({ where: { tenantId: id } })

  // 6. Catálogos
  await prisma.schedule.deleteMany({ where: { tenantId: id } })
  await prisma.department.deleteMany({ where: { tenantId: id } })
  await prisma.position.deleteMany({ where: { tenantId: id } })

  // 7. Usuarios admin
  await prisma.user.deleteMany({ where: { tenantId: id } })

  // 8. Empresa (SupportTicket/SupportMessage/Notification tienen Cascade → se borran solos)
  await prisma.tenant.delete({ where: { id } })
}

// ─── Plans ────────────────────────────────────────────────────────────────────

export async function listPlans() {
  return prisma.plan.findMany({ orderBy: { sortOrder: 'asc' } })
}

export async function createPlan(data: {
  name: string; description: string; priceMonthly: number; priceAnnual?: number
  maxEmployees?: number; isFree?: boolean; features?: string[]; capabilities?: object; sortOrder?: number
}) {
  return prisma.plan.create({ data: { ...data, features: data.features ?? [], capabilities: data.capabilities ?? {} } })
}

export async function updatePlan(id: string, data: Partial<{
  name: string; description: string; priceMonthly: number; priceAnnual: number
  maxEmployees: number; features: string[]; capabilities: object; sortOrder: number; isActive: boolean
}>) {
  const plan = await prisma.plan.findUnique({ where: { id } })
  if (!plan) throw { code: 'NOT_FOUND', message: 'Plan no encontrado.' }
  return prisma.plan.update({ where: { id }, data })
}

export async function getPlanTenants(planId: string) {
  return prisma.subscription.findMany({
    where: { planId },
    select: { tenantId: true, tenant: { select: { name: true } } },
  })
}

export async function deletePlan(id: string) {
  const plan = await prisma.plan.findUnique({ where: { id }, select: { isDefault: true, _count: { select: { subscriptions: true } } } })
  if (!plan) throw { code: 'NOT_FOUND', message: 'Plan no encontrado.' }
  if (plan.isDefault) throw { code: 'BAD_REQUEST', message: 'No se puede eliminar el plan por defecto.' }
  if (plan._count.subscriptions > 0) throw { code: 'BAD_REQUEST', message: 'El plan tiene suscripciones activas.' }

  await prisma.$transaction([
    prisma.subscriptionLog.deleteMany({ where: { planId: id } }),
    prisma.plan.delete({ where: { id } }),
  ])
}

export async function reassignAndDeletePlan(planId: string, targetPlanId: string) {
  const plan = await prisma.plan.findUnique({ where: { id: planId }, select: { isDefault: true } })
  if (!plan) throw { code: 'NOT_FOUND', message: 'Plan no encontrado.' }
  if (plan.isDefault) throw { code: 'BAD_REQUEST', message: 'No se puede eliminar el plan por defecto.' }
  const target = await prisma.plan.findUnique({ where: { id: targetPlanId } })
  if (!target) throw { code: 'NOT_FOUND', message: 'Plan destino no encontrado.' }

  await prisma.$transaction([
    prisma.subscription.updateMany({ where: { planId }, data: { planId: targetPlanId } }),
    prisma.subscriptionLog.deleteMany({ where: { planId } }),
    prisma.plan.delete({ where: { id: planId } }),
  ])
}

// ─── Subscriptions ────────────────────────────────────────────────────────────

export async function listSubscriptions(page: number, pageSize: number, search?: string) {
  const where = search ? {
    OR: [
      { tenant: { name: { contains: search, mode: 'insensitive' as const } } },
      { plan:   { name: { contains: search, mode: 'insensitive' as const } } },
    ],
  } : {}
  const [items, total] = await Promise.all([
    prisma.subscription.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        tenant: { select: { id: true, name: true, country: true } },
        plan: { select: { name: true, priceMonthly: true } },
      },
    }),
    prisma.subscription.count({ where }),
  ])
  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
}

function planChangedEmailHtml(d: {
  companyName: string; country: string
  oldPlan: string; newPlan: string
  oldCycle: string; newCycle: string
  newPrice: number | null; periodEnd: Date | null
  tenantId: string
}): string {
  const cycleFmt = (c: string) => c === 'annual' ? 'Anual' : c === 'monthly' ? 'Mensual' : c
  const row = (label: string, value: string, style = '') =>
    `<div style="padding:10px 0;border-top:1px solid #e2e8f0;">
      <p style="margin:0 0 3px;color:#94a3b8;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">${label}</p>
      <p style="margin:0;color:#0f172a;font-size:14px;word-break:break-word;${style}">${value}</p>
    </div>`
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;">
<div style="max-width:600px;margin:0 auto;padding:20px 12px;">
  <div style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">

    <div style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);padding:24px 20px;">
      <p style="margin:0;font-size:11px;color:#c7d2fe;font-weight:600;letter-spacing:1px;text-transform:uppercase;">TiempoYa · Sistema</p>
      <h1 style="margin:6px 0 0;font-size:20px;color:#ffffff;font-weight:700;">📋 Cambio de plan</h1>
    </div>

    <div style="padding:20px;">
      <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.5;">
        Se ha realizado un cambio de plan para la siguiente empresa:
      </p>

      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:4px 16px 10px;">
        <div style="padding:10px 0;">
          <p style="margin:0 0 3px;color:#94a3b8;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Empresa</p>
          <p style="margin:0;color:#0f172a;font-size:15px;font-weight:700;word-break:break-word;">${d.companyName}</p>
        </div>
        ${row('País', d.country)}
        <div style="padding:10px 0;border-top:1px solid #e2e8f0;">
          <p style="margin:0 0 3px;color:#94a3b8;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Plan anterior</p>
          <p style="margin:0;color:#94a3b8;font-size:14px;text-decoration:line-through;word-break:break-word;">${d.oldPlan} · ${cycleFmt(d.oldCycle)}</p>
        </div>
        ${row('Plan nuevo', `<strong>${d.newPlan}</strong> · ${cycleFmt(d.newCycle)}`)}
        ${d.newPrice != null ? row('Precio nuevo', `$${d.newPrice.toFixed(2)} / ${cycleFmt(d.newCycle)}`, 'font-weight:600;') : ''}
        ${d.periodEnd ? row('Vence', d.periodEnd.toLocaleDateString('es-MX', { day:'numeric', month:'long', year:'numeric' })) : ''}
        <div style="padding:10px 0;border-top:1px solid #e2e8f0;">
          <p style="margin:0 0 3px;color:#94a3b8;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">ID empresa</p>
          <p style="margin:0;color:#64748b;font-size:11px;font-family:monospace,monospace;word-break:break-all;">${d.tenantId}</p>
        </div>
      </div>

      <p style="margin:16px 0 0;font-size:12px;color:#94a3b8;line-height:1.5;">
        Este cambio fue realizado por el administrador del sistema desde el panel de TiempoYa.
      </p>
    </div>

    <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:14px 20px;text-align:center;">
      <p style="margin:0;font-size:11px;color:#94a3b8;">Correo automático · TiempoYa &mdash; No respondas este mensaje.</p>
    </div>

  </div>
</div>
</body>
</html>`
}

export async function changeTenantPlan(tenantId: string, planId: string, billingCycle: 'monthly' | 'annual') {
  const [tenant, plan] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId } }),
    prisma.plan.findUnique({ where: { id: planId } }),
  ])
  if (!tenant) throw { code: 'NOT_FOUND', message: 'Tenant no encontrado.' }
  if (!plan)   throw { code: 'NOT_FOUND', message: 'Plan no encontrado.' }

  const existing = await prisma.subscription.findUnique({
    where:   { tenantId },
    include: { plan: { select: { name: true } } },
  })

  const reminderFields = plan.isFree
    ? { lastPaidPeriodEnd: existing?.currentPeriodEnd ?? existing?.lastPaidPeriodEnd ?? null }
    : { lastPaidPeriodEnd: null, expiryRemindersSent: '[]' }

  const now = new Date()
  const periodEnd = plan.isFree ? null : (() => {
    const d = new Date(now)
    if (billingCycle === 'annual') d.setFullYear(d.getFullYear() + 1)
    else d.setMonth(d.getMonth() + 1)
    return d
  })()

  const dateFields = {
    currentPeriodStart: plan.isFree ? null : now,
    currentPeriodEnd:   periodEnd,
  }

  const result = await prisma.subscription.upsert({
    where:  { tenantId },
    create: { tenantId, planId, billingCycle, status: 'active', ...dateFields, ...reminderFields },
    update: { planId, billingCycle, status: 'active', cancelAtPeriodEnd: false, ...dateFields, ...reminderFields },
  })

  // Solo se ejecuta si el upsert fue exitoso
  sendSystemEmail({
    subject: `📋 Cambio de plan — ${tenant.name}`,
    html:    planChangedEmailHtml({
      companyName:  tenant.name,
      country:      tenant.country ?? '',
      oldPlan:      existing?.plan?.name ?? '—',
      newPlan:      plan.name,
      oldCycle:     existing?.billingCycle ?? '—',
      newCycle:     billingCycle,
      newPrice:     plan.isFree ? null : (billingCycle === 'annual' ? (plan.priceAnnual ?? plan.priceMonthly * 12) : plan.priceMonthly),
      periodEnd:    periodEnd,
      tenantId,
    }),
  }).catch(() => {})

  return result
}

export async function updateSubscriptionDates(tenantId: string, currentPeriodStart: string | null, currentPeriodEnd: string | null) {
  const sub = await prisma.subscription.findUnique({ where: { tenantId } })
  if (!sub) throw { code: 'NOT_FOUND', message: 'Suscripción no encontrada.' }
  return prisma.subscription.update({
    where: { tenantId },
    data: {
      currentPeriodStart: currentPeriodStart ? new Date(currentPeriodStart) : undefined,
      currentPeriodEnd:   currentPeriodEnd   ? new Date(currentPeriodEnd)   : undefined,
    },
  })
}

// ─── System Settings ──────────────────────────────────────────────────────────

export async function getSystemSettings() {
  return prisma.systemSettings.upsert({
    where:  { id: 'system' },
    create: { id: 'system' },
    update: {},
  })
}

export async function updateSystemSettings(data: Partial<{
  smtpEnabled:           boolean
  smtpHost:              string | null
  smtpPort:              number
  smtpUsername:          string | null
  smtpPassword:          string | null
  smtpFromName:          string | null
  gracePeriodDays:       number
  smtpFromEmail:         string | null
  smtpEnableSsl:         boolean
  expiryReminderEnabled: boolean
  expiryReminderTarget:  string
  expiryReminderDays:    string
  requireApproval:       boolean
  termsOfUse:            string | null
  privacyPolicy:         string | null
  supportWhatsapp:       string | null
  supportPhone:          string | null
  supportEmail:          string | null
  supportEmailCcEnabled: boolean
  supportEmailCc:        string
}>) {
  if (data.requireApproval === false) {
    await prisma.tenant.updateMany({
      where: { pendingApproval: true },
      data:  { pendingApproval: false, isActive: true },
    })
  }
  return prisma.systemSettings.upsert({
    where:  { id: 'system' },
    create: { id: 'system', ...data },
    update: data,
  })
}

export async function approveTenant(id: string) {
  const tenant = await prisma.tenant.update({
    where: { id },
    data:  { pendingApproval: false, isActive: true },
    select: { id: true, name: true },
  })

  const adminUser = await prisma.user.findFirst({
    where: { tenantId: id, isDeleted: false },
    orderBy: { createdAt: 'asc' },
    select: { id: true, email: true },
  })

  await createNotificationWithPush({
    tenantId: id,
    forAdmin: false,
    title: '¡Tu empresa ha sido aprobada!',
    body:  `La empresa "${tenant.name}" ha sido verificada y aprobada. Ya puedes iniciar sesión y comenzar a usar TiempoYa.`,
    type:  'success',
  })

  if (adminUser?.email) {
    const html = `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#f8fafc;border-radius:12px">
        <div style="background:#fff;border-radius:10px;padding:32px;border:1px solid #e2e8f0">
          <h2 style="margin:0 0 8px;color:#0f172a;font-size:20px">¡Empresa aprobada! 🎉</h2>
          <p style="color:#475569;font-size:14px;margin:0 0 20px">
            Hola, te informamos que la empresa <strong>${tenant.name}</strong> ha sido verificada y aprobada por el administrador del sistema.
          </p>
          <p style="color:#475569;font-size:14px;margin:0 0 24px">
            Ya puedes iniciar sesión en TiempoYa y comenzar a gestionar la asistencia de tu equipo.
          </p>
          <a href="${process.env.APP_URL ?? 'http://localhost:5173'}/login"
            style="display:inline-block;background:#1e40af;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600">
            Iniciar sesión
          </a>
          <p style="color:#94a3b8;font-size:12px;margin:24px 0 0">TiempoYa · Sistema de Control de Asistencia</p>
        </div>
      </div>`
    await sendSystemEmail(adminUser.email, '✅ Tu empresa ha sido aprobada — TiempoYa', html)
  }

  return tenant
}

// ─── Users (sys) ─────────────────────────────────────────────────────────────

export async function listUsers(page: number, pageSize: number, search?: string, tenantId?: string, role?: string) {
  const where: any = { isDeleted: false }
  if (search) {
    where.OR = [
      { username: { contains: search, mode: 'insensitive' } },
      { email:    { contains: search, mode: 'insensitive' } },
      { tenant:   { name: { contains: search, mode: 'insensitive' } } },
    ]
  }
  if (tenantId) where.tenantId = tenantId
  if (role)     where.role     = role

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, username: true, email: true, role: true,
        isActive: true, mustChangePassword: true, createdAt: true, lastLoginAt: true,
        tenant: { select: { id: true, name: true } },
      },
    }),
    prisma.user.count({ where }),
  ])

  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
}

export async function createSysUser(data: {
  tenantId: string; username: string; email: string; password: string; role: string
}) {
  const tenant = await prisma.tenant.findUnique({ where: { id: data.tenantId } })
  if (!tenant) throw { code: 'NOT_FOUND', message: 'Empresa no encontrada.' }

  const existingUser = await prisma.user.findFirst({ where: { username: data.username.toLowerCase() } })
  if (existingUser) throw { code: 'USERNAME_TAKEN', message: 'El nombre de usuario ya está en uso.' }

  const existingEmail = await prisma.user.findFirst({ where: { email: data.email.toLowerCase(), tenantId: data.tenantId } })
  if (existingEmail) throw { code: 'EMAIL_TAKEN', message: 'El correo ya está registrado en esta empresa.' }

  return prisma.user.create({
    data: {
      tenantId:     data.tenantId,
      username:     data.username.toLowerCase().trim(),
      email:        data.email.toLowerCase().trim(),
      passwordHash: hashPassword(data.password),
      role:         data.role as any,
      mustChangePassword: true,
    },
    select: {
      id: true, username: true, email: true, role: true,
      isActive: true, createdAt: true,
      tenant: { select: { id: true, name: true } },
    },
  })
}

export async function updateSysUser(id: string, data: { username?: string; email?: string; role?: string; isActive?: boolean }) {
  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) throw { code: 'NOT_FOUND', message: 'Usuario no encontrado.' }
  return prisma.user.update({ where: { id }, data: data as any })
}

export async function resetUserPassword(id: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) throw { code: 'NOT_FOUND', message: 'Usuario no encontrado.' }
  return prisma.user.update({
    where: { id },
    data: { passwordHash: hashPassword(newPassword), mustChangePassword: true, failedLoginAttempts: 0, lockedUntil: null },
  })
}

export async function deleteSysUser(id: string) {
  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) throw { code: 'NOT_FOUND', message: 'Usuario no encontrado.' }
  return prisma.user.delete({ where: { id } })
}

// ─── Metrics ─────────────────────────────────────────────────────────────────

export async function getDashboardMetrics() {
  const [
    totalTenants, activeTenants,
    totalEmployees, subscriptions, recentTenants, allPlans,
  ] = await Promise.all([
    prisma.tenant.count(),
    prisma.tenant.count({ where: { isActive: true } }),
    prisma.employee.count(),
    prisma.subscription.findMany({ include: { plan: { select: { id: true, name: true, priceMonthly: true, priceAnnual: true, isFree: true, sortOrder: true } } } }),
    prisma.tenant.findMany({
      take: 5, orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, country: true, createdAt: true, isActive: true },
    }),
    prisma.plan.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }),
  ])

  const mrr = subscriptions.reduce((sum, sub) => {
    if (sub.plan.isFree || sub.status === 'canceled') return sum
    const monthly = sub.billingCycle === 'annual'
      ? (sub.plan.priceAnnual ?? sub.plan.priceMonthly * 12) / 12
      : sub.plan.priceMonthly
    return sum + monthly
  }, 0)

  // Contar suscripciones por plan
  const countByPlan = new Map<string, number>()
  for (const sub of subscriptions) {
    countByPlan.set(sub.planId, (countByPlan.get(sub.planId) ?? 0) + 1)
  }

  // Todos los planes activos, con 0 si no tienen empresas
  const planDistribution = allPlans.map(p => ({
    planId:       p.id,
    name:         p.name,
    count:        countByPlan.get(p.id) ?? 0,
    isFree:       p.isFree,
    priceMonthly: p.priceMonthly,
    sortOrder:    p.sortOrder ?? 0,
  }))

  return {
    totalTenants,
    activeTenants,
    inactiveTenants: totalTenants - activeTenants,
    totalEmployees,
    mrr: Math.round(mrr * 100) / 100,
    arr: Math.round(mrr * 12 * 100) / 100,
    planDistribution,
    recentTenants,
  }
}
