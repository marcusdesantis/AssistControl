import { prisma, verifyPassword, generatePin, sendEmail, generateQr } from '@attendance/shared'
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
    id:             r.id,
    employeeId:     r.employeeId,
    date:           r.date,
    checkInTime:    r.checkInTime  ?? null,
    checkOutTime:   r.checkOutTime ?? null,
    status:         r.status,
    statusLabel:    STATUS_LABEL[r.status] ?? r.status,
    hoursWorked:    hoursWorked(r.checkInTime, r.checkOutTime),
    lateMinutes:    r.lateMinutes ?? 0,
    notes:          r.notes ?? null,
    registeredFrom: r.registeredFrom ?? 'Checker',
    latitude:       r.latitude  ?? null,
    longitude:      r.longitude ?? null,
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

async function buildStats(employeeId: string, todayStr: string) {
  const firstOfMonth = todayStr.substring(0, 7) + '-01'
  const records = await prisma.attendanceRecord.findMany({
    where: { employeeId, date: { gte: firstOfMonth, lte: todayStr }, isDeleted: false },
    orderBy: { date: 'asc' },
  })
  const recordDates      = new Set(records.map(r => r.date))
  const totalLates       = records.filter(r => r.status === 'Late').length
  const pendingCheckouts = records.filter(r => !r.checkOutTime && r.date < todayStr).length
  let absences = 0
  for (let d = DateTime.fromISO(firstOfMonth); d <= DateTime.fromISO(todayStr).minus({ days: 1 }); d = d.plus({ days: 1 })) {
    if (d.weekday >= 6) continue
    if (!recordDates.has(d.toFormat('yyyy-MM-dd'))) absences++
  }
  return { periodFrom: firstOfMonth, periodTo: todayStr, totalLates, pendingCheckouts, absences }
}

async function resolveByKey(checkerKey: string) {
  const tenant = await prisma.tenant.findFirst({ where: { checkerKey, isDeleted: false } })
  if (!tenant) throw { code: 'INVALID_CHECKER_KEY', message: 'Clave del checador inválida o empresa no encontrada.' }
  if (!tenant.isActive) throw { code: 'TENANT_INACTIVE', message: 'Esta empresa ha sido desactivada.' }

  const sub = await prisma.subscription.findUnique({
    where:  { tenantId: tenant.id },
    select: { plan: { select: { capabilities: true } } },
  })
  if (sub) {
    const caps = sub.plan.capabilities as Record<string, { enabled?: boolean }> | null
    if (caps?.checker?.enabled === false)
      throw { code: 'PLAN_LIMIT', message: 'El plan actual no incluye el Reloj Checador. Contacta al administrador.' }
  }

  return tenant
}

export async function getFeed(checkerKey: string) {
  const tenant  = await resolveByKey(checkerKey)
  const tz      = tenant.timeZone ?? 'America/Guayaquil'
  const today   = DateTime.now().setZone(tz).toFormat('yyyy-MM-dd')
  const records = await prisma.attendanceRecord.findMany({
    where: { tenantId: tenant.id, date: today, isDeleted: false },
    include: {
      employee: {
        select: {
          firstName: true, lastName: true, employeeCode: true,
          department: { select: { name: true } },
        },
      },
    },
    orderBy: { checkInTime: 'desc' },
    take: 50,
  })
  return records.map(r => ({
    ...recToDto(r),
    employeeName: r.employee ? `${r.employee.firstName} ${r.employee.lastName}` : '',
    employeeCode: r.employee?.employeeCode ?? '',
    department:   r.employee?.department?.name ?? '',
  }))
}

export async function requestOtp(checkerKey: string, employeeCode: string, pin: string) {
  const tenant = await resolveByKey(checkerKey)
  const emp    = await prisma.employee.findFirst({
    where: { tenantId: tenant.id, employeeCode, isDeleted: false, status: 'Active' },
  })
  if (!emp)           throw { code: 'NOT_FOUND',  message: 'Número de empleado no encontrado.' }
  if (!emp.pinHash)   throw { code: 'NO_PIN',     message: 'Este empleado no tiene clave configurada.' }
  if (!verifyPassword(pin, emp.pinHash)) throw { code: 'INVALID_PIN', message: 'Clave incorrecta.' }
  if (!emp.email)     throw { code: 'NO_EMAIL',   message: 'El empleado no tiene correo registrado para la verificación en dos pasos.' }

  const code      = generatePin(6)
  const expiresAt = new Date(Date.now() + (tenant.checkerOtpExpirationMinutes ?? 5) * 60_000)
  await prisma.checkerOtp.create({ data: { tenantId: tenant.id, employeeId: emp.id, code, expiresAt } })

  if (tenant.smtpEnabled) {
    try {
      const qr = await generateQr(code, 160)
      await sendEmail(tenant.id, {
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
    } catch {
      // El OTP ya fue creado en DB. No bloqueamos al empleado si el email falla.
    }
  }

  const at      = emp.email.indexOf('@')
  const local   = emp.email.substring(0, at)
  const domain  = emp.email.substring(at)
  const visible = local.length > 2 ? local.substring(0, 2) : local.substring(0, 1)
  return `${visible}***${domain}`
}

export async function checkIn(checkerKey: string, employeeCode: string, pin: string, otpCode?: string | null) {
  const tenant = await resolveByKey(checkerKey)
  const emp    = await prisma.employee.findFirst({
    where: { tenantId: tenant.id, employeeCode, isDeleted: false, status: 'Active' },
    include: { schedule: true },
  })
  if (!emp) throw { code: 'NOT_FOUND', message: 'Número de empleado no encontrado.' }
  if (!emp.pinHash) throw { code: 'NO_PIN', message: 'Este empleado no tiene clave configurada.' }
  if (!verifyPassword(pin, emp.pinHash)) throw { code: 'INVALID_PIN', message: 'Clave incorrecta.' }
  if (!emp.scheduleId) throw { code: 'NO_SCHEDULE', message: 'No tienes un horario asignado.' }

  if (tenant.checkerRequires2FA) {
    if (!otpCode) throw { code: 'OTP_REQUIRED', message: 'Se requiere código de verificación.' }
    const otp = await prisma.checkerOtp.findFirst({
      where: { tenantId: tenant.id, employeeId: emp.id, isUsed: false, isDeleted: false, expiresAt: { gte: new Date() } },
      orderBy: { createdAt: 'desc' },
    })
    if (!otp || otp.code !== otpCode.trim()) throw { code: 'OTP_INVALID', message: 'Código incorrecto o expirado.' }
    await prisma.checkerOtp.update({ where: { id: otp.id }, data: { isUsed: true } })
  }

  const tz    = tenant.timeZone ?? 'America/Guayaquil'
  const now   = new Date()
  const today = DateTime.fromJSDate(now, { zone: tz }).toFormat('yyyy-MM-dd')

  const active = await prisma.attendanceRecord.findFirst({
    where: { tenantId: tenant.id, employeeId: emp.id, date: today, checkOutTime: null, isDeleted: false },
  })
  if (active) throw { code: 'ALREADY_CHECKED_IN', message: 'Ya tienes una entrada activa. Registra tu salida primero.' }

  const lateInfo = calcStatus(now, emp.schedule, emp.schedule?.lateToleranceMinutes ?? 0, tz)
  const record   = await prisma.attendanceRecord.create({
    data: { tenantId: tenant.id, employeeId: emp.id, date: today, checkInTime: now, status: lateInfo.status, lateMinutes: lateInfo.lateMinutes, registeredFrom: 'Checker' },
  })

  const [messages, stats] = await Promise.all([
    prisma.employeeMessage.findMany({
      where: { employeeId: emp.id, tenantId: tenant.id, isDeleted: false },
      orderBy: { createdAt: 'desc' },
    }),
    buildStats(emp.id, today),
  ])

  return {
    attendance:      recToDto(record),
    employee:        { id: emp.id, name: `${emp.firstName} ${emp.lastName}`, code: emp.employeeCode },
    // field is "pendingMessages" to match .NET CheckerResponseDto
    pendingMessages: messages.map(m => ({
      id: m.id, employeeId: m.employeeId,
      employeeName: `${emp.firstName} ${emp.lastName}`,
      senderName: m.senderName, subject: m.subject, body: m.body,
      isRead: m.isRead, allowDelete: m.allowDelete, createdAt: m.createdAt,
    })),
    stats,
  }
}

export async function checkOut(checkerKey: string, employeeCode: string, pin: string) {
  const tenant = await resolveByKey(checkerKey)
  const emp    = await prisma.employee.findFirst({
    where: { tenantId: tenant.id, employeeCode, isDeleted: false, status: 'Active' },
  })
  if (!emp) throw { code: 'NOT_FOUND', message: 'Número de empleado no encontrado.' }
  if (!emp.pinHash) throw { code: 'NO_PIN', message: 'Este empleado no tiene clave configurada.' }
  if (!verifyPassword(pin, emp.pinHash)) throw { code: 'INVALID_PIN', message: 'Clave incorrecta.' }

  const tz    = tenant.timeZone ?? 'America/Guayaquil'
  const today = DateTime.now().setZone(tz).toFormat('yyyy-MM-dd')

  const record = await prisma.attendanceRecord.findFirst({
    where: { tenantId: tenant.id, employeeId: emp.id, date: today, checkOutTime: null, isDeleted: false },
  })
  if (!record) throw { code: 'NOT_CHECKED_IN', message: 'No tienes una entrada activa. Registra tu entrada primero.' }

  const updated = await prisma.attendanceRecord.update({
    where: { id: record.id }, data: { checkOutTime: new Date() },
  })

  const [messages, stats] = await Promise.all([
    prisma.employeeMessage.findMany({
      where: { employeeId: emp.id, tenantId: tenant.id, isDeleted: false },
      orderBy: { createdAt: 'desc' },
    }),
    buildStats(emp.id, today),
  ])

  return {
    attendance:      recToDto(updated),
    employee:        { id: emp.id, name: `${emp.firstName} ${emp.lastName}`, code: emp.employeeCode },
    pendingMessages: messages.map(m => ({
      id: m.id, employeeId: m.employeeId,
      employeeName: `${emp.firstName} ${emp.lastName}`,
      senderName: m.senderName, subject: m.subject, body: m.body,
      isRead: m.isRead, allowDelete: m.allowDelete, createdAt: m.createdAt,
    })),
    stats,
  }
}

function schedMins(day: any): number {
  if (!day?.isWorkDay || !day.entryTime || !day.exitTime) return 0
  const [eh, em] = day.entryTime.split(':').map(Number)
  const [xh, xm] = day.exitTime.split(':').map(Number)
  let total = (xh * 60 + xm) - (eh * 60 + em)
  if (day.hasLunch && day.lunchStart && day.lunchEnd) {
    const [lsh, lsm] = day.lunchStart.split(':').map(Number)
    const [leh, lem] = day.lunchEnd.split(':').map(Number)
    total -= (leh * 60 + lem) - (lsh * 60 + lsm)
  }
  return Math.max(0, total)
}

export async function getEmployeeReport(checkerKey: string, employeeId: string, from: string, to: string) {
  const tenant = await resolveByKey(checkerKey)
  const emp    = await prisma.employee.findFirst({
    where: { id: employeeId, tenantId: tenant.id, isDeleted: false, status: 'Active' },
    include: { department: { select: { name: true } }, schedule: true },
  })
  if (!emp) throw { code: 'NOT_FOUND', message: 'Empleado no encontrado.' }

  const records = await prisma.attendanceRecord.findMany({
    where: { employeeId, tenantId: tenant.id, date: { gte: from, lte: to }, isDeleted: false },
    orderBy: { date: 'asc' },
  })

  const recordsByDate = new Map<string, typeof records>()
  for (const r of records) {
    if (!recordsByDate.has(r.date)) recordsByDate.set(r.date, [])
    recordsByDate.get(r.date)!.push(r)
  }

  const tz       = tenant.timeZone ?? 'America/Guayaquil'
  const today    = DateTime.now().setZone(tz).toFormat('yyyy-MM-dd')
  const DAYS_ES  = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const schedDays: any[] = emp.schedule ? (emp.schedule.days as any[]) : []

  const days: any[] = []
  let totalWorked = 0, totalLates = 0, totalAbsences = 0, totalEarlyDeps = 0, incompleteEvents = 0
  let workdays = 0, attended = 0
  let schedNoAbs = 0, schedWithAbs = 0, extraNoAbs = 0, extraWithAbs = 0

  let cur = DateTime.fromISO(from)
  const end = DateTime.fromISO(to)
  while (cur <= end) {
    const dateStr  = cur.toFormat('yyyy-MM-dd')
    const luxonDow = cur.weekday % 7
    const dayName  = DAYS_ES[luxonDow]
    const schedDay = schedDays.find((d: any) => d.day === luxonDow)
    const isWorkDay = schedDay?.isWorkDay ?? false
    const sMin     = schedMins(schedDay)

    if (isWorkDay) { workdays++; schedWithAbs += sMin }

    const dayRecs = (recordsByDate.get(dateStr) ?? []).sort(
      (a, b) => (a.checkInTime?.getTime() ?? 0) - (b.checkInTime?.getTime() ?? 0),
    )

    if (!isWorkDay) {
      days.push({ date: dateStr, dayName, isWorkDay: false, dayStatus: 'Descanso' })
      cur = cur.plus({ days: 1 }); continue
    }
    if (dayRecs.length === 0) {
      if (dateStr <= today) totalAbsences++
      days.push({ date: dateStr, dayName, isWorkDay: true, checkIn: null, checkOut: null,
        workedMinutes: null, scheduledMinutes: sMin, balanceMinutes: null, extraMinutes: null,
        delayMinutes: null, earlyLeaveMinutes: null,
        dayStatus: dateStr > today ? 'Sin registro' : 'Falta' })
      cur = cur.plus({ days: 1 }); continue
    }

    attended++
    schedNoAbs += sMin

    const first = dayRecs[0]; const last = dayRecs[dayRecs.length - 1]
    const workedMins = dayRecs.filter(r => r.checkInTime && r.checkOutTime)
      .reduce((acc, r) => acc + Math.round((r.checkOutTime!.getTime() - r.checkInTime!.getTime()) / 60_000), 0)
    if (workedMins > 0) totalWorked += workedMins

    const balance = workedMins > 0 ? workedMins - sMin : null
    const extra   = balance !== null ? Math.max(0, balance) : null
    if (extra !== null) { extraNoAbs += extra; extraWithAbs += extra }

    const localCheckIn  = first.checkInTime ? DateTime.fromJSDate(first.checkInTime,  { zone: tz }).toFormat('HH:mm') : null
    const localCheckOut = last.checkOutTime ? DateTime.fromJSDate(last.checkOutTime, { zone: tz }).toFormat('HH:mm') : null

    let delayMinutes: number | null = null
    let earlyLeaveMinutes: number | null = null

    if (first.checkInTime && schedDay?.entryTime && emp.schedule) {
      const [eh, em] = schedDay.entryTime.split(':').map(Number)
      const threshold = DateTime.fromJSDate(first.checkInTime, { zone: tz })
        .set({ hour: eh, minute: em, second: 0 })
        .plus({ minutes: emp.schedule.lateToleranceMinutes ?? 0 })
      const checkInDt = DateTime.fromJSDate(first.checkInTime, { zone: tz })
      if (checkInDt > threshold) { delayMinutes = Math.round(checkInDt.diff(threshold, 'minutes').minutes); totalLates++ }
    }

    if (last.checkOutTime && schedDay?.exitTime) {
      const [xh, xm] = schedDay.exitTime.split(':').map(Number)
      const scheduledExit = DateTime.fromJSDate(last.checkOutTime, { zone: tz }).set({ hour: xh, minute: xm, second: 0 })
      const checkOutDt    = DateTime.fromJSDate(last.checkOutTime, { zone: tz })
      if (checkOutDt < scheduledExit) { earlyLeaveMinutes = Math.round(scheduledExit.diff(checkOutDt, 'minutes').minutes); totalEarlyDeps++ }
    }

    if (dayRecs.some(r => !r.checkOutTime) && dateStr < today) incompleteEvents++

    const statusMap: Record<string, string> = { Late: 'Retardo', Present: 'Asistido', Absent: 'Falta', HalfDay: 'Medio Día', Excused: 'Justificado' }
    days.push({
      date: dateStr, dayName, isWorkDay: true,
      checkIn: localCheckIn, checkOut: localCheckOut,
      workedMinutes:    workedMins > 0 ? workedMins : null,
      scheduledMinutes: sMin,
      balanceMinutes:   balance,
      extraMinutes:     extra,
      delayMinutes, earlyLeaveMinutes,
      dayStatus: statusMap[first.status] ?? 'Asistido',
    })
    cur = cur.plus({ days: 1 })
  }

  return {
    employeeName: `${emp.firstName} ${emp.lastName}`, employeeCode: emp.employeeCode,
    department: emp.department?.name ?? '', scheduleName: emp.schedule?.name ?? 'Sin horario',
    from, to, days,
    totalWorkedMinutes:           totalWorked,
    scheduledMinutesNoAbsences:   schedNoAbs,
    extraMinutesNoAbsences:       extraNoAbs,
    balanceMinutesNoAbsences:     totalWorked - schedNoAbs,
    scheduledMinutesWithAbsences: schedWithAbs,
    extraMinutesWithAbsences:     extraWithAbs,
    balanceMinutesWithAbsences:   totalWorked - schedWithAbs,
    totalWorkdays:      workdays,
    workdaysAttended:   attended,
    totalAbsences,
    totalLates,
    totalEarlyDepartures: totalEarlyDeps,
    incompleteEvents,
    attendancePercent: workdays > 0 ? Math.round((attended / workdays) * 100 * 100) / 100 : 0,
  }
}

export async function markMessageRead(checkerKey: string, messageId: string) {
  const tenant = await resolveByKey(checkerKey)
  const msg    = await prisma.employeeMessage.findFirst({ where: { id: messageId, tenantId: tenant.id, isDeleted: false } })
  if (!msg) throw { code: 'NOT_FOUND', message: 'Mensaje no encontrado.' }
  await prisma.employeeMessage.update({ where: { id: messageId }, data: { isRead: true } })
}

export async function deleteMessage(checkerKey: string, messageId: string) {
  const tenant = await resolveByKey(checkerKey)
  const msg    = await prisma.employeeMessage.findFirst({ where: { id: messageId, tenantId: tenant.id, isDeleted: false } })
  if (!msg) throw { code: 'NOT_FOUND', message: 'Mensaje no encontrado.' }
  if (!msg.allowDelete) throw { code: 'NOT_ALLOWED', message: 'Este mensaje no puede ser eliminado.' }
  await prisma.employeeMessage.update({ where: { id: messageId }, data: { isDeleted: true } })
}
