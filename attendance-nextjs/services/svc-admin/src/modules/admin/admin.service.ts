import { prisma, hashPassword } from '@attendance/shared'
import { v4 as uuidv4 } from 'uuid'
import nodemailer from 'nodemailer'

// ─── System email (usa SMTP del sistema, no del tenant) ───────────────────────

async function sendSystemEmail(to: string, subject: string, html: string) {
  const settings = await prisma.systemSettings.findUnique({ where: { id: 'system' } })
  if (!settings?.smtpEnabled || !settings.smtpHost || !settings.smtpUsername || !settings.smtpPassword) return
  const secure = settings.smtpPort === 465
  const transporter = nodemailer.createTransport({
    host: settings.smtpHost, port: settings.smtpPort, secure,
    auth: { user: settings.smtpUsername, pass: settings.smtpPassword },
  })
  await transporter.sendMail({
    from: `"${settings.smtpFromName ?? 'TiempoYa'}" <${settings.smtpUsername}>`,
    to, subject, html,
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

export async function listTenants(page: number, pageSize: number, search?: string) {
  const where = search
    ? { OR: [{ name: { contains: search, mode: 'insensitive' as const } }, { legalName: { contains: search, mode: 'insensitive' as const } }] }
    : {}

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
      id: true, name: true, legalName: true, taxId: true, country: true,
      timeZone: true, logoUrl: true, isActive: true, isDeleted: true, createdAt: true,
      subscription: {
        select: {
          status: true, billingCycle: true, currentPeriodStart: true, currentPeriodEnd: true,
          cancelAtPeriodEnd: true, plan: { select: { id: true, name: true, priceMonthly: true } },
        },
      },
      invoices: { take: 5, orderBy: { createdAt: 'desc' }, select: { id: true, amount: true, currency: true, status: true, createdAt: true } },
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

export async function updateTenant(id: string, data: { name?: string; legalName?: string; country?: string; timeZone?: string }) {
  const tenant = await prisma.tenant.findUnique({ where: { id } })
  if (!tenant) throw { code: 'NOT_FOUND', message: 'Tenant no encontrado.' }
  return prisma.tenant.update({ where: { id }, data })
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
  return prisma.plan.delete({ where: { id } })
}

export async function reassignAndDeletePlan(planId: string, targetPlanId: string) {
  const plan = await prisma.plan.findUnique({ where: { id: planId }, select: { isDefault: true } })
  if (!plan) throw { code: 'NOT_FOUND', message: 'Plan no encontrado.' }
  if (plan.isDefault) throw { code: 'BAD_REQUEST', message: 'No se puede eliminar el plan por defecto.' }
  const target = await prisma.plan.findUnique({ where: { id: targetPlanId } })
  if (!target) throw { code: 'NOT_FOUND', message: 'Plan destino no encontrado.' }

  await prisma.$transaction([
    prisma.subscription.updateMany({ where: { planId }, data: { planId: targetPlanId } }),
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

export async function changeTenantPlan(tenantId: string, planId: string, billingCycle: 'monthly' | 'annual') {
  const [tenant, plan] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId } }),
    prisma.plan.findUnique({ where: { id: planId } }),
  ])
  if (!tenant) throw { code: 'NOT_FOUND', message: 'Tenant no encontrado.' }
  if (!plan)   throw { code: 'NOT_FOUND', message: 'Plan no encontrado.' }

  const existing = await prisma.subscription.findUnique({ where: { tenantId } })

  const reminderFields = plan.isFree
    ? { lastPaidPeriodEnd: existing?.currentPeriodEnd ?? existing?.lastPaidPeriodEnd ?? null }
    : { lastPaidPeriodEnd: null, expiryRemindersSent: '[]' }

  return prisma.subscription.upsert({
    where:  { tenantId },
    create: { tenantId, planId, billingCycle, status: 'active', ...reminderFields },
    update: { planId, billingCycle, status: 'active', cancelAtPeriodEnd: false, ...reminderFields },
  })
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

  await prisma.notification.create({
    data: {
      tenantId: id,
      forAdmin: false,
      title: '¡Tu empresa ha sido aprobada!',
      body:  `La empresa "${tenant.name}" ha sido verificada y aprobada. Ya puedes iniciar sesión y comenzar a usar TiempoYa.`,
      type:  'success',
    },
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
    totalEmployees, subscriptions, recentTenants,
  ] = await Promise.all([
    prisma.tenant.count(),
    prisma.tenant.count({ where: { isActive: true } }),
    prisma.employee.count(),
    prisma.subscription.findMany({ include: { plan: { select: { priceMonthly: true, priceAnnual: true, isFree: true } } } }),
    prisma.tenant.findMany({
      take: 5, orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, country: true, createdAt: true, isActive: true },
    }),
  ])

  const mrr = subscriptions.reduce((sum, sub) => {
    if (sub.plan.isFree || sub.status === 'canceled') return sum
    const monthly = sub.billingCycle === 'annual'
      ? (sub.plan.priceAnnual ?? sub.plan.priceMonthly * 12) / 12
      : sub.plan.priceMonthly
    return sum + monthly
  }, 0)

  const planDist = subscriptions.reduce<Record<string, number>>((acc, sub) => {
    const key = sub.planId
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})

  return {
    totalTenants,
    activeTenants,
    inactiveTenants: totalTenants - activeTenants,
    totalEmployees,
    mrr: Math.round(mrr * 100) / 100,
    arr: Math.round(mrr * 12 * 100) / 100,
    planDistribution: planDist,
    recentTenants,
  }
}
