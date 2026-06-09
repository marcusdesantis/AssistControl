import { prisma, hashPassword, verifyPassword, signAdmin, getTenantCapabilities, DEFAULT_CAPABILITIES, sendSystemEmail, createNotificationWithPush } from '@attendance/shared'
import { v4 as uuidv4 } from 'uuid'
import type { RegisterDto, LoginDto, ChangePasswordDto, UpdateMeDto, ForgotPasswordDto, ResetPasswordDto } from './auth.schema'

const REFRESH_TOKEN_DAYS       = 7
const ACCESS_TOKEN_HOURS       = 24
const VERIFY_TOKEN_EXPIRY_HOURS = 72 // 3 días

function refreshExpiresAt(): Date {
  const d = new Date()
  d.setDate(d.getDate() + REFRESH_TOKEN_DAYS)
  return d
}

function accessExpiresAt(): Date {
  const d = new Date()
  d.setHours(d.getHours() + ACCESS_TOKEN_HOURS)
  return d
}

function verifyTokenExpiry(): Date {
  const d = new Date()
  d.setHours(d.getHours() + VERIFY_TOKEN_EXPIRY_HOURS)
  return d
}

function verificationEmailHtml(companyName: string, verifyUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:#1e3a5f;padding:32px 40px;text-align:center;">
            <p style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:1px;">TiempoYa</p>
            <p style="margin:6px 0 0;color:#9bb8d4;font-size:13px;">Sistema de Gestión de Asistencia</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px 40px 32px;">
            <h2 style="margin:0 0 12px;color:#1e3a5f;font-size:22px;">Confirma tu correo electrónico</h2>
            <p style="margin:0 0 8px;color:#444;font-size:15px;line-height:1.6;">
              Hola, gracias por registrar <strong>${companyName}</strong> en TiempoYa.
            </p>
            <p style="margin:0 0 28px;color:#555;font-size:14px;line-height:1.6;">
              Para activar tu cuenta, confirma tu dirección de correo haciendo clic en el botón de abajo.
              El enlace es válido por <strong>24 horas</strong>.
            </p>
            <!-- CTA button -->
            <table cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td align="center" style="padding:0 0 28px;">
                  <a href="${verifyUrl}"
                     style="display:inline-block;background:#1e3a5f;color:#ffffff;font-size:15px;font-weight:600;
                            text-decoration:none;padding:14px 36px;border-radius:8px;letter-spacing:0.3px;">
                    ✓ Confirmar correo electrónico
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 8px;color:#888;font-size:12px;">Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
            <p style="margin:0;font-size:12px;word-break:break-all;">
              <a href="${verifyUrl}" style="color:#1e3a5f;">${verifyUrl}</a>
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e8ecf0;text-align:center;">
            <p style="margin:0;color:#aaa;font-size:12px;">
              Si no creaste esta cuenta, ignora este mensaje.<br>
              © ${new Date().getFullYear()} TiempoYa — Sistema de Control de Asistencia
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function newRegistrationEmailHtml(d: {
  companyName: string; email: string; country: string; timeZone: string
  plan: string; requiresApproval: boolean; tenantId: string
}): string {
  const statusBadge = d.requiresApproval
    ? `<span style="color:#d97706;font-weight:600;">⏳ Pendiente de aprobación</span>`
    : `<span style="color:#16a34a;font-weight:600;">✅ Activa automáticamente</span>`
  const approvalNote = d.requiresApproval
    ? `<div style="background:#fef3c7;border-left:4px solid #f59e0b;border-radius:6px;padding:12px 16px;margin:0 0 24px;font-size:13px;color:#92400e;">
        Esta empresa requiere <strong>aprobación manual</strong> antes de poder acceder al sistema.
       </div>`
    : ''
  const row = (label: string, value: string, mono = false) =>
    `<div style="padding:10px 0;border-top:1px solid #e2e8f0;">
      <p style="margin:0 0 3px;color:#94a3b8;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">${label}</p>
      <p style="margin:0;color:${mono ? '#64748b' : '#0f172a'};font-size:${mono ? '11px' : '14px'};font-family:${mono ? 'monospace,monospace' : 'inherit'};word-break:break-all;overflow-wrap:anywhere;">${value}</p>
    </div>`
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;">
<div style="max-width:600px;margin:0 auto;padding:20px 12px;">
  <div style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">

    <div style="background:linear-gradient(135deg,#3b82f6 0%,#6366f1 100%);padding:24px 20px;">
      <p style="margin:0;font-size:11px;color:#bfdbfe;font-weight:600;letter-spacing:1px;text-transform:uppercase;">TiempoYa · Sistema</p>
      <h1 style="margin:6px 0 0;font-size:20px;color:#ffffff;font-weight:700;">🏢 Nueva empresa registrada</h1>
    </div>

    <div style="padding:20px;">
      <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.5;">
        Se ha completado la verificación de correo. Datos de la nueva empresa:
      </p>

      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:4px 16px 10px;">
        <div style="padding:10px 0;">
          <p style="margin:0 0 3px;color:#94a3b8;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Empresa</p>
          <p style="margin:0;color:#0f172a;font-size:15px;font-weight:700;word-break:break-word;">${d.companyName}</p>
        </div>
        ${row('Email administrador', d.email)}
        ${row('País', d.country)}
        ${row('Zona horaria', d.timeZone)}
        ${row('Plan asignado', d.plan)}
        ${row('ID empresa', d.tenantId, true)}
        <div style="padding:10px 0;border-top:1px solid #e2e8f0;">
          <p style="margin:0 0 3px;color:#94a3b8;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Estado</p>
          <p style="margin:0;font-size:13px;">${statusBadge}</p>
        </div>
      </div>

      ${approvalNote}

      <p style="margin:16px 0 0;font-size:12px;color:#94a3b8;line-height:1.5;">
        Puedes revisar esta empresa desde el panel de administración de TiempoYa.
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

// ─── Register new tenant + admin ──────────────────────────────────────────────
export async function registerTenant(dto: RegisterDto) {
  const settings = await prisma.systemSettings.findUnique({ where: { id: 'system' } })
  const smtpReady = !!(settings?.smtpEnabled && settings?.smtpHost && settings?.smtpUsername && settings?.smtpPassword)

  if (!smtpReady)
    throw { code: 'SMTP_NOT_CONFIGURED', message: 'El registro de empresas no está disponible en este momento. Contacta al administrador.' }

  // Validar duplicados en tenants activos
  const [existingUser, existingEmail, existingCompany] = await Promise.all([
    prisma.user.findFirst({ where: { username: dto.username.toLowerCase() } }),
    prisma.user.findFirst({ where: { email: dto.email.toLowerCase() } }),
    prisma.tenant.findFirst({ where: { name: { equals: dto.companyName.trim(), mode: 'insensitive' }, isDeleted: false } }),
  ])
  if (existingUser)    throw { code: 'USERNAME_TAKEN',      message: 'El nombre de usuario ya está en uso.' }
  if (existingEmail)   throw { code: 'EMAIL_TAKEN',         message: 'El correo electrónico ya está registrado.' }
  if (existingCompany) throw { code: 'COMPANY_NAME_TAKEN',  message: 'Ya existe una empresa con ese nombre.' }

  // Validar duplicados en registros pendientes de verificación
  const [pendingUser, pendingEmail, pendingCompany] = await Promise.all([
    prisma.pendingRegistration.findFirst({ where: { username: dto.username.toLowerCase(), expiresAt: { gt: new Date() } } }),
    prisma.pendingRegistration.findFirst({ where: { email: dto.email.toLowerCase(),       expiresAt: { gt: new Date() } } }),
    prisma.pendingRegistration.findFirst({ where: { companyName: { equals: dto.companyName.trim(), mode: 'insensitive' }, expiresAt: { gt: new Date() } } }),
  ])
  if (pendingUser)    throw { code: 'USERNAME_TAKEN',     message: 'El nombre de usuario ya está en uso.' }
  if (pendingEmail)   throw { code: 'EMAIL_TAKEN',        message: 'El correo electrónico ya tiene un registro pendiente de verificación.' }
  if (pendingCompany) throw { code: 'COMPANY_NAME_TAKEN', message: 'Ya existe un registro pendiente con ese nombre de empresa.' }

  const defaultPlan = await prisma.plan.findFirst({ where: { isDefault: true, isActive: true } })
  if (!defaultPlan) throw { code: 'NO_DEFAULT_PLAN', message: 'No hay un plan por defecto configurado.' }

  const token = uuidv4()
  await prisma.pendingRegistration.create({
    data: {
      token,
      expiresAt:    verifyTokenExpiry(),
      companyName:  dto.companyName.trim(),
      timeZone:     dto.timeZone,
      country:      dto.country,
      username:     dto.username.toLowerCase().trim(),
      email:        dto.email.toLowerCase().trim(),
      passwordHash: hashPassword(dto.password),
    },
  })

  const frontendUrl = process.env.FRONTEND_URL ?? process.env.APP_URL ?? 'http://localhost:3000'
  const verifyUrl   = `${frontendUrl}/verify-email?token=${token}`

  try {
    await sendSystemEmail({
      to:      dto.email.toLowerCase().trim(),
      subject: 'Confirma tu correo electrónico — TiempoYa',
      html:    verificationEmailHtml(dto.companyName.trim(), verifyUrl),
    })
  } catch (err: any) {
    console.error('[register] EMAIL ERROR:', err?.code, err?.message, err?.response)
    await prisma.pendingRegistration.delete({ where: { token } })
    throw { code: 'EMAIL_SEND_ERROR', message: 'No se pudo enviar el correo de verificación. Intenta más tarde.' }
  }

  return { registered: true, emailVerification: true }
}

// ─── Resend verification email ────────────────────────────────────────────────
export async function resendVerificationEmail(email: string) {
  const normalEmail = email.toLowerCase().trim()

  // Si ya existe como tenant verificado, no hay nada que reenviar
  const existingUser = await prisma.user.findFirst({ where: { email: normalEmail, isDeleted: false } })
  if (existingUser)
    throw { code: 'ALREADY_VERIFIED', message: 'Este correo ya fue verificado. Puedes iniciar sesión.' }

  const pending = await prisma.pendingRegistration.findFirst({ where: { email: normalEmail } })
  if (!pending)
    throw { code: 'EMAIL_NOT_FOUND', message: 'No existe un registro pendiente con ese correo electrónico.' }

  const newToken = uuidv4()
  await prisma.pendingRegistration.update({
    where: { id: pending.id },
    data:  { token: newToken, expiresAt: verifyTokenExpiry() },
  })

  const frontendUrl = process.env.FRONTEND_URL ?? process.env.APP_URL ?? 'http://localhost:3000'
  const verifyUrl   = `${frontendUrl}/verify-email?token=${newToken}`

  await sendSystemEmail({
    to:      normalEmail,
    subject: 'Nuevo enlace de verificación — TiempoYa',
    html:    verificationEmailHtml(pending.companyName, verifyUrl),
  })

  return { sent: true }
}

// ─── Verify email ──────────────────────────────────────────────────────────────
export async function verifyEmail(token: string) {
  const pending = await prisma.pendingRegistration.findUnique({ where: { token } })

  if (!pending)
    throw { code: 'INVALID_TOKEN', message: 'El enlace de verificación no es válido o ya fue utilizado.' }

  if (pending.expiresAt < new Date())
    throw { code: 'TOKEN_EXPIRED', message: 'El enlace de verificación ha expirado. Por favor regístrate de nuevo.' }

  const [defaultPlan, settings] = await Promise.all([
    prisma.plan.findFirst({ where: { isDefault: true, isActive: true } }),
    prisma.systemSettings.findUnique({ where: { id: 'system' } }),
  ])
  if (!defaultPlan) throw { code: 'NO_DEFAULT_PLAN', message: 'No hay un plan por defecto configurado.' }

  const requireApproval = settings?.requireApproval ?? false

  // Crear tenant + usuario + suscripción en una transacción
  const tenant = await prisma.$transaction(async (tx) => {
    const newTenant = await tx.tenant.create({
      data: {
        name:           pending.companyName,
        timeZone:       pending.timeZone,
        country:        pending.country,
        checkerKey:     uuidv4(),
        selfRegistered: true,
        emailVerified:  true,
        isActive:       !requireApproval,
        pendingApproval: requireApproval,
      },
    })

    await tx.user.create({
      data: {
        tenantId:           newTenant.id,
        username:           pending.username,
        email:              pending.email,
        passwordHash:       pending.passwordHash,
        role:               'Admin',
        mustChangePassword: false,
      },
    })

    await tx.subscription.create({
      data: { tenantId: newTenant.id, planId: defaultPlan.id, billingCycle: 'monthly', status: 'active' },
    })

    await tx.pendingRegistration.delete({ where: { id: pending.id } })

    return newTenant
  })

  createNotificationWithPush({
    forAdmin: true,
    title:    'Nueva empresa verificada',
    body:     requireApproval
      ? `La empresa "${tenant.name}" verificó su correo y está pendiente de aprobación.`
      : `La empresa "${tenant.name}" verificó su correo y ya está activa.`,
    type: requireApproval ? 'warning' : 'info',
  }).catch(() => {})

  sendSystemEmail({
    subject: `🏢 Nueva empresa registrada — ${tenant.name}`,
    html:    newRegistrationEmailHtml({
      companyName:     tenant.name,
      email:           pending.email,
      country:         pending.country,
      timeZone:        pending.timeZone,
      plan:            defaultPlan.name,
      requiresApproval: requireApproval,
      tenantId:        tenant.id,
    }),
  }).catch(() => {})

  return { verified: true, requiresApproval: requireApproval, tenantId: tenant.id, companyName: tenant.name }
}

// ─── Login ────────────────────────────────────────────────────────────────────
export async function login(dto: LoginDto) {
  const user = await prisma.user.findFirst({
    where: { username: dto.username.toLowerCase().trim(), isDeleted: false },
  })

  if (!user)
    throw { code: 'INVALID_CREDENTIALS', message: 'Credenciales incorrectas.' }

  if (!user.isActive)
    throw { code: 'USER_INACTIVE', message: 'Tu usuario ha sido desactivado. Contacta al administrador.' }

  const tenant = await prisma.tenant.findUnique({
    where:  { id: user.tenantId },
    select: { isActive: true, pendingApproval: true, timeZone: true, country: true, selfRegistered: true, emailVerified: true, emailVerificationToken: true, onboardingCompleted: true, deletionRequestedAt: true },
  })

  if (tenant?.selfRegistered && !tenant.emailVerified)
    throw { code: 'EMAIL_NOT_VERIFIED', message: 'Debes confirmar tu correo electrónico antes de iniciar sesión. Revisa tu bandeja de entrada.' }

  if (tenant?.pendingApproval)
    throw { code: 'TENANT_PENDING', message: 'Tu empresa está en proceso de validación. El administrador del sistema la aprobará pronto.' }
  if (!tenant?.isActive)
    throw { code: 'TENANT_INACTIVE', message: 'Tu empresa ha sido desactivada. Contacta al administrador del sistema.' }
  if (tenant?.deletionRequestedAt)
    throw { code: 'ACCOUNT_DELETION_PENDING', message: 'Esta cuenta está en proceso de eliminación. Si cambiaste de opinión, contacta a soporte dentro de las 24 horas.', deletionRequestedAt: tenant.deletionRequestedAt }

  if (user.lockedUntil && user.lockedUntil > new Date())
    throw { code: 'ACCOUNT_LOCKED', message: 'Cuenta bloqueada temporalmente. Intente más tarde.' }

  if (!verifyPassword(dto.password, user.passwordHash)) {
    const attempts    = user.failedLoginAttempts + 1
    const lockedUntil = attempts >= 5 ? new Date(Date.now() + 30 * 60 * 1000) : null
    await prisma.user.update({
      where: { id: user.id },
      data:  { failedLoginAttempts: attempts, lockedUntil },
    })
    throw { code: 'INVALID_CREDENTIALS', message: 'Credenciales incorrectas.' }
  }

  await prisma.refreshToken.updateMany({
    where: { userId: user.id, isRevoked: false },
    data:  { isRevoked: true },
  })

  const accessToken   = signAdmin({ sub: user.id, tenantId: user.tenantId, role: user.role, username: user.username })
  const refreshString = uuidv4()
  await prisma.refreshToken.create({
    data: { userId: user.id, token: refreshString, expiresAt: refreshExpiresAt() },
  })
  await prisma.user.update({
    where: { id: user.id },
    data:  { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
  })

  const capabilities = await getTenantCapabilities(user.tenantId).catch(() => DEFAULT_CAPABILITIES)

  return {
    accessToken,
    refreshToken: refreshString,
    expiresAt:    accessExpiresAt(),
    user: { id: user.id, username: user.username, email: user.email, role: user.role, tenantId: user.tenantId, mustChangePassword: user.mustChangePassword, timeZone: tenant.timeZone, country: tenant.country, onboardingCompleted: tenant.onboardingCompleted },
    capabilities,
  }
}

// ─── Refresh ──────────────────────────────────────────────────────────────────
export async function refreshToken(token: string) {
  const stored = await prisma.refreshToken.findFirst({ where: { token } })
  if (!stored || stored.isRevoked || stored.isUsed || stored.expiresAt < new Date())
    throw { code: 'INVALID_REFRESH_TOKEN', message: 'Refresh token inválido o expirado.' }

  const user = await prisma.user.findFirst({ where: { id: stored.userId, isDeleted: false } })
  if (!user)
    throw { code: 'USER_NOT_FOUND', message: 'Usuario no encontrado.' }

  if (!user.isActive)
    throw { code: 'USER_INACTIVE', message: 'Tu usuario ha sido desactivado. Contacta al administrador.' }

  const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId }, select: { isActive: true, timeZone: true, country: true, deletionRequestedAt: true } })
  if (!tenant?.isActive)
    throw { code: 'TENANT_INACTIVE', message: 'Tu empresa ha sido desactivada.' }
  if (tenant?.deletionRequestedAt)
    throw { code: 'ACCOUNT_DELETION_PENDING', message: 'Esta cuenta está en proceso de eliminación.', deletionRequestedAt: tenant.deletionRequestedAt }

  await prisma.refreshToken.update({ where: { id: stored.id }, data: { isRevoked: true } })

  const newAccessToken   = signAdmin({ sub: user.id, tenantId: user.tenantId, role: user.role, username: user.username })
  const newRefreshString = uuidv4()
  await prisma.refreshToken.create({
    data: { userId: user.id, token: newRefreshString, expiresAt: refreshExpiresAt() },
  })

  const capabilities = await getTenantCapabilities(user.tenantId).catch(() => DEFAULT_CAPABILITIES)

  return {
    accessToken:  newAccessToken,
    refreshToken: newRefreshString,
    expiresAt:    accessExpiresAt(),
    user: { id: user.id, username: user.username, email: user.email, role: user.role, tenantId: user.tenantId, mustChangePassword: user.mustChangePassword, timeZone: tenant.timeZone, country: tenant.country },
    capabilities,
  }
}

// ─── Logout ───────────────────────────────────────────────────────────────────
export async function logout(userId: string) {
  await prisma.refreshToken.updateMany({
    where: { userId, isRevoked: false },
    data:  { isRevoked: true },
  })
}

// ─── Change password ──────────────────────────────────────────────────────────
export async function changePassword(userId: string, dto: ChangePasswordDto) {
  const user = await prisma.user.findFirst({ where: { id: userId, isDeleted: false } })
  if (!user) throw { code: 'USER_NOT_FOUND', message: 'Usuario no encontrado.' }

  if (!verifyPassword(dto.currentPassword, user.passwordHash))
    throw { code: 'INVALID_CURRENT_PASSWORD', message: 'La contraseña actual es incorrecta.' }

  await prisma.user.update({
    where: { id: userId },
    data:  { passwordHash: hashPassword(dto.newPassword), mustChangePassword: false },
  })
}

// ─── Update profile ───────────────────────────────────────────────────────────
export async function updateMe(userId: string, dto: UpdateMeDto) {
  const user = await prisma.user.findFirst({ where: { id: userId, isDeleted: false } })
  if (!user) throw { code: 'USER_NOT_FOUND', message: 'Usuario no encontrado.' }
  if (dto.email && dto.email.toLowerCase() !== user.email.toLowerCase()) {
    const taken = await prisma.user.findFirst({ where: { email: dto.email.toLowerCase(), isDeleted: false } })
    if (taken) throw { code: 'EMAIL_TAKEN', message: 'Este correo ya está en uso.' }
  }
  const updated = await prisma.user.update({
    where: { id: userId },
    data:  { ...(dto.email ? { email: dto.email.toLowerCase() } : {}) },
  })
  return { id: updated.id, username: updated.username, email: updated.email, role: updated.role }
}

// ─── Forgot password ──────────────────────────────────────────────────────────
export async function forgotPassword(dto: ForgotPasswordDto, frontendUrl: string) {
  const user = await prisma.user.findFirst({
    where: { email: dto.email.toLowerCase(), isDeleted: false, isActive: true },
  })
  if (!user) throw { code: 'EMAIL_NOT_FOUND', message: 'No existe una cuenta asociada a este correo electrónico.' }

  // Invalidar tokens anteriores
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, isUsed: false },
    data:  { isUsed: true },
  })

  const token     = uuidv4()
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hora

  await prisma.passwordResetToken.create({
    data: { userId: user.id, token, expiresAt },
  })

  const resetUrl = `${frontendUrl}/reset-password?token=${token}`

  await sendSystemEmail({
    to:      user.email,
    subject: 'Recuperar contraseña — TiempoYa',
    html: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background:#1e3a5f;padding:32px 40px;text-align:center;">
          <p style="margin:0;color:#ffffff;font-size:26px;font-weight:700;">TiempoYa</p>
          <p style="margin:6px 0 0;color:#9bb8d4;font-size:13px;">Sistema de Gestión de Asistencia</p>
        </td></tr>
        <tr><td style="padding:40px 40px 32px;">
          <h2 style="margin:0 0 12px;color:#1e3a5f;font-size:22px;">Recuperar contraseña</h2>
          <p style="margin:0 0 8px;color:#444;font-size:15px;line-height:1.6;">
            Hola <strong>${user.username}</strong>, recibimos una solicitud para restablecer tu contraseña.
          </p>
          <p style="margin:0 0 28px;color:#555;font-size:14px;line-height:1.6;">
            Haz clic en el botón de abajo para crear una nueva contraseña. El enlace es válido por <strong>1 hora</strong>.
          </p>
          <table cellpadding="0" cellspacing="0" width="100%"><tr><td align="center" style="padding:0 0 28px;">
            <a href="${resetUrl}" style="display:inline-block;background:#1e3a5f;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:8px;">
              Restablecer contraseña
            </a>
          </td></tr></table>
          <p style="margin:0;color:#999;font-size:12px;">
            Si no solicitaste este cambio, ignora este correo. Tu contraseña no será modificada.
          </p>
        </td></tr>
        <tr><td style="background:#f4f6f9;padding:20px 40px;text-align:center;">
          <p style="margin:0;color:#aaa;font-size:11px;">© ${new Date().getFullYear()} TiempoYa · Todos los derechos reservados</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  })
}

// ─── Reset password ───────────────────────────────────────────────────────────
export async function resetPassword(dto: ResetPasswordDto) {
  const record = await prisma.passwordResetToken.findUnique({ where: { token: dto.token } })
  if (!record || record.isUsed || record.expiresAt < new Date())
    throw { code: 'INVALID_TOKEN', message: 'El enlace de recuperación es inválido o ha expirado.' }

  const user = await prisma.user.update({
    where: { id: record.userId },
    data:  { passwordHash: hashPassword(dto.newPassword), mustChangePassword: false },
    select: { id: true, tenantId: true, username: true },
  })
  await prisma.passwordResetToken.update({
    where: { id: record.id },
    data:  { isUsed: true },
  })
  return { userId: user.id, tenantId: user.tenantId, username: user.username }
}

// ─── Verify password ──────────────────────────────────────────────────────────
export async function verifyUserPassword(userId: string, password: string): Promise<boolean> {
  const user = await prisma.user.findFirst({ where: { id: userId, isDeleted: false } })
  if (!user) throw { code: 'USER_NOT_FOUND', message: 'Usuario no encontrado.' }
  return verifyPassword(password, user.passwordHash)
}
