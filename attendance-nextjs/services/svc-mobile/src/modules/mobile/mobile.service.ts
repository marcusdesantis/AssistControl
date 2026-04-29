import { prisma, verifyPassword, signEmployee, generatePin, sendEmail, generateQr } from '@attendance/shared'
import { DateTime } from 'luxon'

function hoursWorked(a: Date | null, b: Date | null) {
  if (!a || !b) return null
  return Math.round(((b.getTime() - a.getTime()) / 3_600_000) * 100) / 100
}

const STATUS_LABEL: Record<string, string> = {
  Present: 'Presente', Late: 'Tarde', Absent: 'Ausente', HalfDay: 'Medio Día', Excused: 'Justificado',
}

function recToDto(r: any) {
  return {
    id: r.id, employeeId: r.employeeId, date: r.date,
    checkInTime: r.checkInTime ?? null, checkOutTime: r.checkOutTime ?? null,
    status: r.status, statusLabel: STATUS_LABEL[r.status] ?? r.status,
    hoursWorked: hoursWorked(r.checkInTime, r.checkOutTime),
    lateMinutes: r.lateMinutes ?? 0, notes: r.notes ?? null,
    registeredFrom: r.registeredFrom ?? 'Mobile',
    latitude: r.latitude ?? null, longitude: r.longitude ?? null,
  }
}

function recToDtoWithEmployee(r: any) {
  return {
    ...recToDto(r),
    employeeCode: r.employee?.employeeCode ?? '',
    employeeName: r.employee ? `${r.employee.firstName} ${r.employee.lastName}` : '',
    department:   r.employee?.department?.name ?? null,
  }
}

function calcStatus(checkInUtc: Date, schedule: any | null, tolerance: number, tz: string) {
  if (!schedule || !Array.isArray(schedule.days)) return { status: 'Present' as const, lateMinutes: 0 }
  const local   = DateTime.fromJSDate(checkInUtc, { zone: tz })
  const weekday = local.weekday % 7
  const day     = (schedule.days as any[]).find((d: any) => d.day === weekday)
  if (!day?.isWorkDay || !day.entryTime) return { status: 'Present' as const, lateMinutes: 0 }
  const [h, m] = day.entryTime.split(':').map(Number)
  const threshold = local.set({ hour: h, minute: m, second: 0, millisecond: 0 }).plus({ minutes: tolerance })
  if (local <= threshold) return { status: 'Present' as const, lateMinutes: 0 }
  return { status: 'Late' as const, lateMinutes: Math.round(local.diff(threshold, 'minutes').minutes) }
}

export async function login(username: string, password: string) {
  const employee = await prisma.employee.findFirst({
    where: { username: username.trim().toLowerCase(), isDeleted: false },
  })
  if (!employee || !verifyPassword(password, employee.passwordHash))
    throw { code: 'INVALID_CREDENTIALS', message: 'Usuario o contraseña incorrectos.' }

  if (employee.status === 'Inactive')
    throw { code: 'USER_INACTIVE', message: 'Tu usuario ha sido desactivado. Contacta con tu empresa para más información.' }

  const tenant = await prisma.tenant.findFirst({ where: { id: employee.tenantId } })
  if (!tenant?.isActive)
    throw { code: 'TENANT_INACTIVE', message: 'Tu empresa ha sido desactivada. Contacta al administrador.' }

  const subscription = await prisma.subscription.findFirst({
    where: { tenantId: employee.tenantId },
    include: { plan: true },
  })
  const caps = subscription?.plan?.capabilities as any
  if (!caps?.mobileApp?.enabled)
    throw { code: 'MOBILE_NOT_ALLOWED', message: 'Tu plan no incluye acceso a la aplicación móvil. Contacta con el administrador de tu empresa.' }

  const token  = signEmployee({ sub: employee.id, tenantId: employee.tenantId, employeeCode: employee.employeeCode })

  return {
    token,
    employeeId:   employee.id,
    employeeCode: employee.employeeCode,
    fullName:     `${employee.firstName} ${employee.lastName}`,
    email:        employee.email,
    hasSchedule:  !!employee.scheduleId,
    companyName:  tenant?.name      ?? '',
    logoBase64:   tenant?.logoBase64 ?? null,
    logoUrl:      tenant?.logoUrl    ?? null,
  }
}

export async function getProfile(employeeId: string, tenantId: string) {
  const emp = await prisma.employee.findFirst({
    where: { id: employeeId, tenantId, isDeleted: false },
    include: { department: { select: { name: true } }, position: { select: { name: true } }, schedule: true },
  })
  if (!emp) throw { code: 'NOT_FOUND', message: 'Empleado no encontrado.' }
  return {
    id: emp.id, employeeCode: emp.employeeCode,
    firstName: emp.firstName, lastName: emp.lastName,
    fullName: `${emp.firstName} ${emp.lastName}`,
    email: emp.email, phone: emp.phone ?? null,
    departmentName: emp.department?.name ?? null,
    positionName:   emp.position?.name   ?? null,
    scheduleName:   emp.schedule?.name   ?? null,
    hireDate: emp.hireDate, hasPin: !!emp.pinHash,
  }
}

async function assertMobileAccess(tenantId: string) {
  const subscription = await prisma.subscription.findFirst({
    where: { tenantId },
    include: { plan: true },
  })
  const caps = subscription?.plan?.capabilities as any
  if (!caps?.mobileApp?.enabled)
    throw { code: 'MOBILE_NOT_ALLOWED', message: 'Tu plan no incluye acceso a la aplicación móvil. Contacta con el administrador de tu empresa.' }
}

export async function getTodayStatus(employeeId: string, tenantId: string) {
  await assertMobileAccess(tenantId)
  const tenant  = await prisma.tenant.findFirst({ where: { id: tenantId } })
  const tz      = tenant?.timeZone ?? 'America/Guayaquil'
  const today   = DateTime.now().setZone(tz).toFormat('yyyy-MM-dd')
  const records = await prisma.attendanceRecord.findMany({
    where: { employeeId, tenantId, date: today, isDeleted: false }, orderBy: { checkInTime: 'asc' },
  })
  const active = records.find(r => !r.checkOutTime) ?? null
  return { date: today, records: records.map(recToDto), active: active ? recToDto(active) : null, hasEntry: records.length > 0 }
}

export async function checkIn(
  employeeId: string, tenantId: string, pin: string,
  opts?: { otpCode?: string | null; latitude?: number | null; longitude?: number | null },
) {
  const emp = await prisma.employee.findFirst({
    where: { id: employeeId, tenantId, isDeleted: false, status: 'Active' },
    include: { schedule: true },
  })
  if (!emp) throw { code: 'NOT_FOUND', message: 'Empleado no encontrado.' }
  if (!emp.pinHash) throw { code: 'NO_PIN', message: 'No tienes una clave configurada.' }
  if (!verifyPassword(pin, emp.pinHash)) throw { code: 'INVALID_PIN', message: 'Clave incorrecta.' }
  if (!emp.scheduleId) throw { code: 'NO_SCHEDULE', message: 'No tienes un horario asignado.' }

  const tenant = await prisma.tenant.findFirst({ where: { id: tenantId } })
  const tz     = tenant?.timeZone ?? 'America/Guayaquil'

  if (tenant?.checkerRequires2FA) {
    if (!opts?.otpCode) throw { code: 'OTP_REQUIRED', message: 'Se requiere código de verificación.' }
    const otp = await prisma.checkerOtp.findFirst({
      where: { tenantId, employeeId, isUsed: false, isDeleted: false, expiresAt: { gte: new Date() } },
      orderBy: { createdAt: 'desc' },
    })
    if (!otp || otp.code !== opts.otpCode.trim()) throw { code: 'OTP_INVALID', message: 'Código incorrecto o expirado.' }
    await prisma.checkerOtp.update({ where: { id: otp.id }, data: { isUsed: true } })
  }

  const now   = new Date()
  const today = DateTime.fromJSDate(now, { zone: tz }).toFormat('yyyy-MM-dd')

  const active = await prisma.attendanceRecord.findFirst({
    where: { tenantId, employeeId, date: today, checkOutTime: null, isDeleted: false },
  })
  if (active) throw { code: 'ALREADY_CHECKED_IN', message: 'Ya tienes una entrada activa. Registra tu salida primero.' }

  const lateInfo = calcStatus(now, emp.schedule, emp.schedule?.lateToleranceMinutes ?? 0, tz)
  const record   = await prisma.attendanceRecord.create({
    data: { tenantId, employeeId, date: today, checkInTime: now, status: lateInfo.status, lateMinutes: lateInfo.lateMinutes, latitude: opts?.latitude ?? null, longitude: opts?.longitude ?? null, registeredFrom: 'Mobile' },
  })

  const messages = await prisma.employeeMessage.findMany({
    where: { employeeId, tenantId, isDeleted: false },
    orderBy: { createdAt: 'desc' },
  })

  return {
    attendance: recToDto(record),
    pendingMessages: messages.map(m => ({
      id: m.id, senderName: m.senderName, subject: m.subject,
      body: m.body, isRead: m.isRead, allowDelete: m.allowDelete,
      createdAt: m.createdAt,
    })),
  }
}

export async function checkOut(employeeId: string, tenantId: string) {
  const tenant = await prisma.tenant.findFirst({ where: { id: tenantId } })
  const tz     = tenant?.timeZone ?? 'America/Guayaquil'
  const today  = DateTime.now().setZone(tz).toFormat('yyyy-MM-dd')
  const record = await prisma.attendanceRecord.findFirst({
    where: { tenantId, employeeId, date: today, checkOutTime: null, isDeleted: false },
  })
  if (!record) throw { code: 'NO_ACTIVE_CHECKIN', message: 'No tienes una entrada activa hoy.' }

  const updated  = await prisma.attendanceRecord.update({ where: { id: record.id }, data: { checkOutTime: new Date() } })
  const messages = await prisma.employeeMessage.findMany({
    where: { employeeId, tenantId, isDeleted: false },
    orderBy: { createdAt: 'desc' },
  })

  return {
    attendance: recToDto(updated),
    pendingMessages: messages.map(m => ({
      id: m.id, senderName: m.senderName, subject: m.subject,
      body: m.body, isRead: m.isRead, allowDelete: m.allowDelete,
      createdAt: m.createdAt,
    })),
  }
}

export async function getHistory(
  employeeId: string, tenantId: string,
  from?: string, to?: string,
  page = 1, pageSize = 20, status?: string,
) {
  const tenant = await prisma.tenant.findFirst({ where: { id: tenantId } })
  const tz     = tenant?.timeZone ?? 'America/Guayaquil'
  const today  = DateTime.now().setZone(tz).toFormat('yyyy-MM-dd')
  const fromDate = from ?? DateTime.now().setZone(tz).startOf('month').toFormat('yyyy-MM-dd')
  const toDate   = to   ?? today

  const where: any = { employeeId, tenantId, isDeleted: false, date: { gte: fromDate, lte: toDate } }
  if (status && status !== 'All') where.status = status

  const INCLUDE_EMP = { employee: { select: { employeeCode: true, firstName: true, lastName: true, department: { select: { name: true } } } } }
  const [items, total] = await Promise.all([
    prisma.attendanceRecord.findMany({ where, include: INCLUDE_EMP, orderBy: [{ date: 'desc' }, { checkInTime: 'desc' }], skip: (page - 1) * pageSize, take: pageSize }),
    prisma.attendanceRecord.count({ where }),
  ])
  return { items: items.map(recToDtoWithEmployee), total, page, pageSize, hasMore: page * pageSize < total }
}

export async function requestOtp(employeeId: string, tenantId: string, pin: string) {
  const emp = await prisma.employee.findFirst({
    where: { id: employeeId, tenantId, isDeleted: false, status: 'Active' },
  })
  if (!emp) throw { code: 'NOT_FOUND', message: 'Empleado no encontrado.' }

  // Validate PIN always (same as .NET behavior)
  if (!emp.pinHash) throw { code: 'NO_PIN', message: 'No tienes una clave configurada. Solicita al administrador que te asigne una.' }
  if (!verifyPassword(pin, emp.pinHash)) throw { code: 'INVALID_PIN', message: 'Clave incorrecta.' }

  const tenant = await prisma.tenant.findFirst({ where: { id: tenantId } })
  if (!tenant) throw { code: 'NOT_FOUND', message: 'Empresa no encontrada.' }

  // If 2FA not required, PIN is sufficient — no OTP needed
  if (!tenant.checkerRequires2FA) {
    return { required: false, maskedEmail: null }
  }

  // 2FA enabled: generate and send OTP
  const code      = generatePin(6)
  const expiresAt = new Date(Date.now() + (tenant.checkerOtpExpirationMinutes ?? 5) * 60_000)
  await prisma.checkerOtp.create({ data: { tenantId, employeeId, code, expiresAt } })

  if (tenant.smtpEnabled && emp.email) {
    try {
      const qr = await generateQr(code, 160)
      await sendEmail(tenantId, {
        to: emp.email, subject: 'Tu código de verificación',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:400px;margin:0 auto;padding:24px;text-align:center">
            <h3 style="color:#1e40af">Hola ${emp.firstName}</h3>
            <p style="color:#374151">Tu código de verificación es:</p>
            <p style="font-size:36px;font-weight:bold;font-family:monospace;letter-spacing:8px;color:#1e40af;margin:16px 0">${code}</p>
            <img src="${qr}" alt="QR código OTP" width="160" height="160" style="border:1px solid #e5e7eb;border-radius:8px;padding:6px;margin:8px 0" />
            <p style="color:#6b7280;font-size:12px">Expira en ${tenant.checkerOtpExpirationMinutes ?? 5} minutos.</p>
          </div>
        `,
      })
    } catch { /* no bloqueamos si el email falla */ }
  }

  const at      = emp.email.indexOf('@')
  const local   = emp.email.substring(0, at)
  const domain  = emp.email.substring(at)
  const visible = local.length > 2 ? local.substring(0, 2) : local.substring(0, 1)
  return { required: true, maskedEmail: `${visible}***${domain}` }
}

export async function updatePushToken(employeeId: string, tenantId: string, token: string) {
  const emp = await prisma.employee.findFirst({ where: { id: employeeId, tenantId, isDeleted: false } })
  if (!emp) throw { code: 'NOT_FOUND', message: 'Empleado no encontrado.' }
  await prisma.employee.update({ where: { id: employeeId }, data: { expoPushToken: token } })
}

export async function getMessages(employeeId: string, tenantId: string, page = 1, pageSize = 20) {
  const where = { employeeId, tenantId, isDeleted: false }
  const [items, total] = await Promise.all([
    prisma.employeeMessage.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.employeeMessage.count({ where }),
  ])
  return {
    items: items.map(m => ({ id: m.id, senderName: m.senderName, subject: m.subject, body: m.body, isRead: m.isRead, allowDelete: m.allowDelete, createdAt: m.createdAt })),
    total, page, pageSize, hasMore: page * pageSize < total,
  }
}

export async function markMessageRead(id: string, employeeId: string, tenantId: string) {
  const msg = await prisma.employeeMessage.findFirst({ where: { id, employeeId, tenantId, isDeleted: false } })
  if (!msg) throw { code: 'NOT_FOUND', message: 'Mensaje no encontrado.' }
  await prisma.employeeMessage.update({ where: { id }, data: { isRead: true } })
}

export async function deleteMessage(id: string, employeeId: string, tenantId: string) {
  const msg = await prisma.employeeMessage.findFirst({ where: { id, employeeId, tenantId, isDeleted: false } })
  if (!msg) throw { code: 'NOT_FOUND', message: 'Mensaje no encontrado.' }
  if (!msg.allowDelete) throw { code: 'NOT_ALLOWED', message: 'Este mensaje no puede ser eliminado.' }
  await prisma.employeeMessage.update({ where: { id }, data: { isDeleted: true } })
}
