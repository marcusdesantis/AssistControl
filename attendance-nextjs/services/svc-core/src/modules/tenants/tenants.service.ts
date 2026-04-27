import { prisma, sendEmail, generateQr, hashPassword, generatePin } from '@attendance/shared'
import { v4 as uuidv4 } from 'uuid'
import type { UpdateProfileDto, UpdateSettingsDto, SendInvitationDto } from './tenants.schema'

const SMTP_MASK = '••••••••'

// ─── Company profile ──────────────────────────────────────────────────────────
export async function getProfile(tenantId: string) {
  const tenant = await prisma.tenant.findFirst({ where: { id: tenantId, isDeleted: false } })
  if (!tenant) throw { code: 'NOT_FOUND', message: 'Empresa no encontrada.' }
  return tenant
}

export async function updateProfile(tenantId: string, dto: UpdateProfileDto) {
  const tenant = await prisma.tenant.findFirst({ where: { id: tenantId, isDeleted: false } })
  if (!tenant) throw { code: 'NOT_FOUND', message: 'Empresa no encontrada.' }

  return prisma.tenant.update({
    where: { id: tenantId },
    data: {
      name:            dto.name.trim(),
      legalName:       dto.legalName ?? null,
      taxId:           dto.taxId ?? null,
      businessLicense: dto.businessLicense ?? null,
      logoBase64:      dto.logoBase64 !== undefined ? dto.logoBase64 : tenant.logoBase64,
      street:          dto.street ?? null,
      betweenStreets:  dto.betweenStreets ?? null,
      neighborhood:    dto.neighborhood ?? null,
      city:            dto.city ?? null,
      postalCode:      dto.postalCode ?? null,
      municipality:    dto.municipality ?? null,
      state:           dto.state ?? null,
      phone1:          dto.phone1 ?? null,
      phone2:          dto.phone2 ?? null,
      fax:             dto.fax ?? null,
      email:           dto.email || null,
      website:         dto.website ?? null,
    },
  })
}

// ─── Settings ─────────────────────────────────────────────────────────────────
export async function getSettings(tenantId: string) {
  const tenant = await prisma.tenant.findFirst({ where: { id: tenantId, isDeleted: false } })
  if (!tenant) throw { code: 'NOT_FOUND', message: 'Empresa no encontrada.' }
  return {
    employeeCodePrefix:          tenant.employeeCodePrefix,
    invitationExpirationHours:   tenant.invitationExpirationHours,
    invitationEmails:            tenant.invitationEmails,
    smtpEnabled:                 tenant.smtpEnabled,
    smtpHost:                    tenant.smtpHost,
    smtpPort:                    tenant.smtpPort,
    smtpUsername:                tenant.smtpUsername,
    smtpPassword:                tenant.smtpPassword ? SMTP_MASK : null,
    smtpFromName:                tenant.smtpFromName,
    smtpEnableSsl:               tenant.smtpEnableSsl,
    checkerKey:                  tenant.checkerKey,
    checkerRequires2FA:          tenant.checkerRequires2FA,
    checkerOtpExpirationMinutes: tenant.checkerOtpExpirationMinutes,
  }
}

export async function updateSettings(tenantId: string, dto: UpdateSettingsDto) {
  const tenant = await prisma.tenant.findFirst({ where: { id: tenantId, isDeleted: false } })
  if (!tenant) throw { code: 'NOT_FOUND', message: 'Empresa no encontrada.' }

  const smtpPassword = dto.smtpPassword === SMTP_MASK ? tenant.smtpPassword : (dto.smtpPassword ?? null)

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      employeeCodePrefix:          dto.employeeCodePrefix.trim().toUpperCase() || 'EMP-',
      invitationExpirationHours:   dto.invitationExpirationHours > 0 ? dto.invitationExpirationHours : 48,
      invitationEmails:            dto.invitationEmails?.trim() ?? null,
      smtpEnabled:                 dto.smtpEnabled,
      smtpHost:                    dto.smtpHost?.trim() ?? null,
      smtpPort:                    dto.smtpPort > 0 ? dto.smtpPort : 587,
      smtpUsername:                dto.smtpUsername?.trim() ?? null,
      smtpPassword,
      smtpFromName:                dto.smtpFromName?.trim() ?? null,
      smtpEnableSsl:               dto.smtpEnableSsl,
      checkerKey:                  dto.checkerKey?.trim() || tenant.checkerKey,
      checkerRequires2FA:          dto.checkerRequires2FA,
      checkerOtpExpirationMinutes: dto.checkerOtpExpirationMinutes > 0 ? dto.checkerOtpExpirationMinutes : 5,
    },
  })

  return getSettings(tenantId)
}

export async function regenerateCheckerKey(tenantId: string) {
  await prisma.tenant.update({ where: { id: tenantId }, data: { checkerKey: uuidv4() } })
  return getSettings(tenantId)
}

// ─── Send invitation ──────────────────────────────────────────────────────────
export async function sendInvitation(tenantId: string, dto: SendInvitationDto, baseUrl: string) {
  const tenant = await prisma.tenant.findFirst({ where: { id: tenantId, isDeleted: false } })
  if (!tenant) throw { code: 'NOT_FOUND', message: 'Empresa no encontrada.' }

  const emails = (tenant.invitationEmails ?? '').split(',').map(e => e.trim()).filter(Boolean)
  if (emails.length === 0)
    throw { code: 'NO_INVITATION_EMAILS', message: 'No hay correos de invitación configurados.' }

  const token     = uuidv4().replace(/-/g, '')
  const expiresAt = new Date(Date.now() + tenant.invitationExpirationHours * 60 * 60 * 1000)

  const invitation = await prisma.employeeInvitation.create({
    data: {
      tenantId,
      token,
      sentTo:       emails.join(','),
      assignedCode: dto.assignedCode?.trim().toUpperCase() ?? null,
      scheduleId:   dto.scheduleId ?? null,
      expiresAt,
    },
  })

  const registrationUrl = `${baseUrl}/register/${token}`
  const smtpReady = !!(tenant.smtpEnabled && tenant.smtpHost && tenant.smtpUsername && tenant.smtpPassword)

  if (smtpReady) {
    const qr = await generateQr(registrationUrl, 220)
    await sendEmail(tenantId, {
      to:      emails,
      subject: `Invitación para registrarte en ${tenant.name}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px">
          <h2 style="color:#1e40af">Bienvenido a ${tenant.name}</h2>
          <p>Has sido invitado a registrarte en el sistema de asistencia.</p>
          <p>Haz clic en el botón o escanea el código QR para completar tu registro:</p>
          <a href="${registrationUrl}" style="background:#2563eb;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;display:inline-block;margin:16px 0;font-weight:bold;">
            Registrarme ahora
          </a>
          <div style="margin:24px 0;text-align:center">
            <p style="color:#555;font-size:13px;margin-bottom:8px">O escanea este QR con tu teléfono:</p>
            <img src="${qr}" alt="QR de registro" width="220" height="220" style="border:1px solid #e5e7eb;border-radius:8px;padding:8px" />
          </div>
          <p style="color:#6b7280;font-size:12px">Este enlace expira en ${tenant.invitationExpirationHours} horas.</p>
          <p style="color:#9ca3af;font-size:11px">Si no esperabas esta invitación, puedes ignorar este correo.</p>
        </div>
      `,
    })
  }

  return { invitationId: invitation.id, token, expiresAt, sentTo: emails, url: registrationUrl, emailSent: smtpReady }
}

// ─── Public: get invitation info ──────────────────────────────────────────────
export async function getInvitationInfo(token: string) {
  const inv = await prisma.employeeInvitation.findFirst({
    where:   { token, isDeleted: false },
    include: { tenant: { select: { id: true, name: true, logoBase64: true, employeeCodePrefix: true } } },
  })

  const isValid = !!(inv && !inv.isUsed && inv.expiresAt >= new Date())

  if (!isValid) {
    return {
      isValid:            false,
      companyName:        '',
      logoBase64:         null as string | null,
      employeeCodePrefix: 'EMP-',
      departments:        [] as { id: string; name: string }[],
      positions:          [] as { id: string; name: string }[],
      hasSchedule:        false,
    }
  }

  const tenantId = inv!.tenant.id
  const [departments, positions] = await Promise.all([
    prisma.department.findMany({ where: { tenantId, isDeleted: false }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.position.findMany({   where: { tenantId, isDeleted: false }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ])

  return {
    isValid:            true,
    companyName:        inv!.tenant.name,
    logoBase64:         inv!.tenant.logoBase64,
    employeeCodePrefix: inv!.tenant.employeeCodePrefix,
    departments,
    positions,
    hasSchedule:        !!inv!.scheduleId,
  }
}

// ─── Public: register employee from invitation ────────────────────────────────
export async function registerFromInvitation(token: string, data: {
  firstName: string; lastName: string; email: string
  username: string; password: string; phone?: string | null
  departmentId?: string | null; positionId?: string | null
}) {
  const inv = await prisma.employeeInvitation.findFirst({ where: { token, isDeleted: false } })
  if (!inv)         throw { code: 'INVALID_TOKEN',       message: 'La invitación no es válida o ha expirado.' }
  if (inv.isUsed)   throw { code: 'INVITATION_USED',     message: 'Esta invitación ya fue utilizada.' }
  if (inv.expiresAt < new Date()) throw { code: 'INVITATION_EXPIRED', message: 'Esta invitación ha expirado.' }

  const username = data.username.trim().toLowerCase()
  const taken    = await prisma.employee.findFirst({ where: { username, isDeleted: false } })
  if (taken) throw { code: 'DUPLICATE_USERNAME', message: 'El nombre de usuario ya está en uso. Elige otro.' }

  // Employee code
  let employeeCode: string
  if (inv.assignedCode) {
    const codeExists = await prisma.employee.findFirst({
      where: { tenantId: inv.tenantId, employeeCode: inv.assignedCode, isDeleted: false },
    })
    if (codeExists) throw { code: 'CODE_DUPLICATE', message: 'El código pre-asignado ya está en uso.' }
    employeeCode = inv.assignedCode
  } else {
    const tenant = await prisma.tenant.findFirst({ where: { id: inv.tenantId } })
    const prefix = tenant?.employeeCodePrefix ?? 'EMP-'
    const last   = await prisma.employee.findFirst({
      where:   { tenantId: inv.tenantId, employeeCode: { startsWith: prefix }, isDeleted: false },
      orderBy: { employeeCode: 'desc' },
    })
    const seq    = last ? (parseInt(last.employeeCode.replace(prefix, '')) || 0) + 1 : 1
    employeeCode = `${prefix}${String(seq).padStart(3, '0')}`
  }

  const pin           = generatePin(6)
  const passwordPlain = data.password.trim()

  const emp = await prisma.employee.create({
    data: {
      tenantId:        inv.tenantId,
      employeeCode,
      firstName:       data.firstName.trim(),
      lastName:        data.lastName.trim(),
      departmentId:    data.departmentId ?? null,
      positionId:      data.positionId   ?? null,
      scheduleId:      inv.scheduleId    ?? null,
      email:           data.email.trim().toLowerCase(),
      phone:           data.phone?.trim() ?? null,
      hireDate:        new Date().toISOString().split('T')[0],
      username,
      passwordHash:    hashPassword(passwordPlain),
      passwordDisplay: passwordPlain,
      pinHash:         hashPassword(pin),
      pinDisplay:      pin,
    },
  })

  await prisma.employeeInvitation.update({
    where: { id: inv.id },
    data:  { isUsed: true, usedAt: new Date(), employeeId: emp.id },
  })

  return { employeeId: emp.id, employeeCode, pin, username, password: passwordPlain }
}
