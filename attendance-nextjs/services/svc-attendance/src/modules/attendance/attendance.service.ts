import { prisma } from '@attendance/shared'
import { DateTime } from 'luxon'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_LABEL: Record<string, string> = {
  Present: 'Presente', Late: 'Tarde', Absent: 'Ausente', HalfDay: 'Medio Día', Excused: 'Justificado', None: 'Sin registro',
}

function statusLabel(key: string) { return STATUS_LABEL[key] ?? key }

function calcStatus(
  checkInUtc: Date,
  schedule: any | null,
  lateToleranceMinutes: number,
  tz: string,
): { status: 'Present' | 'Late'; lateMinutes: number } {
  if (!schedule || !Array.isArray(schedule.days)) return { status: 'Present', lateMinutes: 0 }

  const local   = DateTime.fromJSDate(checkInUtc, { zone: tz })
  const weekday = local.weekday % 7
  const dayConf = (schedule.days as any[]).find((d: any) => d.day === weekday)

  if (!dayConf?.isWorkDay || !dayConf.entryTime) return { status: 'Present', lateMinutes: 0 }

  const [entryH, entryM] = dayConf.entryTime.split(':').map(Number)
  const threshold = local.set({ hour: entryH, minute: entryM, second: 0, millisecond: 0 })
    .plus({ minutes: lateToleranceMinutes })

  if (local <= threshold) return { status: 'Present', lateMinutes: 0 }
  return { status: 'Late', lateMinutes: Math.round(local.diff(threshold, 'minutes').minutes) }
}

function hoursWorked(checkIn: Date | null, checkOut: Date | null): number | null {
  if (!checkIn || !checkOut) return null
  return Math.round(((checkOut.getTime() - checkIn.getTime()) / 3_600_000) * 100) / 100
}

function toDto(r: any) {
  return {
    id:             r.id,
    employeeId:     r.employeeId,
    employeeCode:   r.employee?.employeeCode ?? '',
    employeeName:   r.employee ? `${r.employee.firstName} ${r.employee.lastName}` : '',
    department:     r.employee?.department?.name ?? '',
    date:           r.date,
    checkInTime:    r.checkInTime  ?? null,
    checkOutTime:   r.checkOutTime ?? null,
    notes:          r.notes        ?? null,
    status:         r.status,
    statusLabel:    statusLabel(r.status),
    hoursWorked:    hoursWorked(r.checkInTime, r.checkOutTime),
    lateMinutes:    r.lateMinutes ?? 0,
    registeredFrom: r.registeredFrom ?? 'Web',
    latitude:       r.latitude  ?? null,
    longitude:      r.longitude ?? null,
    tenantId:       r.tenantId,
  }
}

const INCLUDE_EMP = {
  employee: {
    select: {
      firstName:    true,
      lastName:     true,
      employeeCode: true,
      department:   { select: { name: true } },
    },
  },
}

// ─── Get by date range (flat list) ────────────────────────────────────────────
export async function getByDateRange(tenantId: string, from: string, to: string) {
  const items = await prisma.attendanceRecord.findMany({
    where:   { tenantId, date: { gte: from, lte: to }, isDeleted: false },
    include: INCLUDE_EMP,
    orderBy: [{ date: 'asc' }, { checkInTime: 'asc' }],
  })
  return items.map(toDto)
}

// ─── Get by employee ──────────────────────────────────────────────────────────
export async function getByEmployee(
  employeeId: string, tenantId: string,
  from: string, to: string,
  page = 1, pageSize = 30,
) {
  const where = { tenantId, employeeId, date: { gte: from, lte: to }, isDeleted: false }
  const [items, total] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where, include: INCLUDE_EMP, orderBy: { date: 'desc' },
      skip: (page - 1) * pageSize, take: pageSize,
    }),
    prisma.attendanceRecord.count({ where }),
  ])
  return { items: items.map(toDto), total, page, pageSize }
}

// ─── Day view ─────────────────────────────────────────────────────────────────
export async function getDayView(
  tenantId: string, date: string,
  page = 1, pageSize = 50,
  search?: string, department?: string, status?: string,
) {
  const employees = await prisma.employee.findMany({
    where:   { tenantId, isDeleted: false, status: 'Active' },
    include: { department: { select: { name: true } }, schedule: true },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
  })

  const records = await prisma.attendanceRecord.findMany({
    where: { tenantId, date, isDeleted: false }, orderBy: { checkInTime: 'asc' },
  })

  const recordsByEmp: Record<string, typeof records> = {}
  for (const r of records) {
    if (!recordsByEmp[r.employeeId]) recordsByEmp[r.employeeId] = []
    recordsByEmp[r.employeeId].push(r)
  }

  let rows = employees.map(e => {
    const empRecords = recordsByEmp[e.id] ?? []
    const rec        = empRecords.find(r => !r.checkOutTime) ?? empRecords[empRecords.length - 1]
    const statusKey  = rec ? rec.status : 'None'

    const subRecords = empRecords.map(r => ({
      id:             r.id,
      checkInTime:    r.checkInTime  ?? null,
      checkOutTime:   r.checkOutTime ?? null,
      hoursWorked:    hoursWorked(r.checkInTime, r.checkOutTime),
      registeredFrom: r.registeredFrom,
      latitude:       r.latitude  ?? null,
      longitude:      r.longitude ?? null,
    }))

    return {
      employeeId:     e.id,
      employeeCode:   e.employeeCode,
      fullName:       `${e.firstName} ${e.lastName}`,
      department:     e.department?.name ?? '',
      attendanceId:   rec?.id ?? null,
      statusKey,
      statusLabel:    statusLabel(statusKey),
      checkInTime:    rec?.checkInTime  ?? null,
      checkOutTime:   rec?.checkOutTime ?? null,
      hoursWorked:    rec ? hoursWorked(rec.checkInTime, rec.checkOutTime) : null,
      notes:          rec?.notes        ?? null,
      registeredFrom: rec?.registeredFrom ?? '',
      latitude:       rec?.latitude  ?? null,
      longitude:      rec?.longitude ?? null,
      lateMinutes:    rec?.lateMinutes ?? 0,
      records:        subRecords,
    }
  })

  if (search) {
    const q = search.toLowerCase()
    rows = rows.filter(r =>
      r.fullName.toLowerCase().includes(q) ||
      r.employeeCode.toLowerCase().includes(q) ||
      r.department.toLowerCase().includes(q),
    )
  }
  if (department && department !== 'Todos') rows = rows.filter(r => r.department === department)
  if (status     && status     !== 'All')   rows = rows.filter(r => r.statusKey  === status)

  const total = rows.length
  const items = rows.slice((page - 1) * pageSize, page * pageSize)
  return { items, total, page, pageSize }
}

// ─── Period view ──────────────────────────────────────────────────────────────
export async function getPeriodView(
  tenantId: string, from: string, to: string,
  page = 1, pageSize = 50,
  search?: string, department?: string,
) {
  const employees = await prisma.employee.findMany({
    where:   { tenantId, isDeleted: false, status: 'Active' },
    include: { department: { select: { name: true } } },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
  })

  const records = await prisma.attendanceRecord.findMany({
    where: { tenantId, date: { gte: from, lte: to }, isDeleted: false },
  })

  const recordsByEmp: Record<string, typeof records> = {}
  for (const r of records) {
    if (!recordsByEmp[r.employeeId]) recordsByEmp[r.employeeId] = []
    recordsByEmp[r.employeeId].push(r)
  }

  let rows = employees.map(e => {
    const recs = recordsByEmp[e.id] ?? []
    return {
      employeeId:   e.id,
      employeeCode: e.employeeCode,
      fullName:     `${e.firstName} ${e.lastName}`,
      department:   e.department?.name ?? '',
      present:      recs.filter(r => r.status === 'Present').length,
      late:         recs.filter(r => r.status === 'Late').length,
      absent:       recs.filter(r => r.status === 'Absent').length,
      totalHours:   Math.round(recs.reduce((acc, r) => acc + (hoursWorked(r.checkInTime, r.checkOutTime) ?? 0), 0) * 100) / 100,
    }
  })

  if (search) {
    const q = search.toLowerCase()
    rows = rows.filter(r => r.fullName.toLowerCase().includes(q) || r.employeeCode.toLowerCase().includes(q))
  }
  if (department && department !== 'Todos') rows = rows.filter(r => r.department === department)

  const total = rows.length
  const items = rows.slice((page - 1) * pageSize, page * pageSize)
  return { items, total, page, pageSize }
}

// ─── Check-in ─────────────────────────────────────────────────────────────────
export async function checkIn(
  tenantId: string, employeeId: string,
  opts?: { notes?: string | null; latitude?: number | null; longitude?: number | null; registeredFrom?: string },
) {
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, tenantId, isDeleted: false }, include: { schedule: true },
  })
  if (!employee) throw { code: 'NOT_FOUND', message: 'Empleado no encontrado.' }

  const tenant = await prisma.tenant.findFirst({ where: { id: tenantId } })
  const tz     = tenant?.timeZone ?? 'America/Guayaquil'
  const now    = new Date()
  const today  = DateTime.fromJSDate(now, { zone: tz }).toFormat('yyyy-MM-dd')

  const active = await prisma.attendanceRecord.findFirst({
    where: { tenantId, employeeId, date: today, checkOutTime: null, isDeleted: false },
  })
  if (active) throw { code: 'ALREADY_CHECKED_IN', message: 'El empleado ya tiene una entrada activa. Debe registrar su salida primero.' }

  const lateInfo = calcStatus(now, employee.schedule, employee.schedule?.lateToleranceMinutes ?? 0, tz)

  const record = await prisma.attendanceRecord.create({
    data: {
      tenantId, employeeId,
      date:           today,
      checkInTime:    now,
      status:         lateInfo.status,
      lateMinutes:    lateInfo.lateMinutes,
      notes:          opts?.notes          ?? null,
      latitude:       opts?.latitude       ?? null,
      longitude:      opts?.longitude      ?? null,
      registeredFrom: opts?.registeredFrom ?? 'Web',
    },
    include: INCLUDE_EMP,
  })
  return toDto(record)
}

// ─── Check-out ────────────────────────────────────────────────────────────────
export async function checkOut(
  tenantId: string, employeeId: string,
  opts?: { notes?: string | null },
) {
  const employee = await prisma.employee.findFirst({ where: { id: employeeId, tenantId, isDeleted: false } })
  if (!employee) throw { code: 'NOT_FOUND', message: 'Empleado no encontrado.' }

  const tenant = await prisma.tenant.findFirst({ where: { id: tenantId } })
  const tz     = tenant?.timeZone ?? 'America/Guayaquil'
  const today  = DateTime.now().setZone(tz).toFormat('yyyy-MM-dd')

  const record = await prisma.attendanceRecord.findFirst({
    where: { tenantId, employeeId, date: today, checkOutTime: null, isDeleted: false },
    include: INCLUDE_EMP,
  })
  if (!record) throw { code: 'NOT_CHECKED_IN', message: 'El empleado no tiene una entrada activa hoy.' }

  const updated = await prisma.attendanceRecord.update({
    where: { id: record.id },
    data:  { checkOutTime: new Date(), notes: opts?.notes ?? record.notes },
    include: INCLUDE_EMP,
  })
  return toDto(updated)
}

// ─── Update record ────────────────────────────────────────────────────────────
export async function updateRecord(
  id: string, tenantId: string,
  data: { checkInTime?: string | null; checkOutTime?: string | null; notes?: string | null; status?: string },
) {
  const record = await prisma.attendanceRecord.findFirst({
    where: { id, tenantId, isDeleted: false },
    include: { employee: { include: { schedule: true } } },
  })
  if (!record) throw { code: 'NOT_FOUND', message: 'Registro no encontrado.' }

  const tenant   = await prisma.tenant.findFirst({ where: { id: tenantId } })
  const tz       = tenant?.timeZone ?? 'America/Guayaquil'
  const checkIn  = data.checkInTime  ? new Date(data.checkInTime)  : record.checkInTime
  const checkOut = data.checkOutTime ? new Date(data.checkOutTime) : record.checkOutTime

  let status      = (data.status ?? record.status) as any
  let lateMinutes = record.lateMinutes

  if (data.checkInTime && record.employee?.schedule) {
    const late  = calcStatus(new Date(data.checkInTime), record.employee.schedule, record.employee.schedule.lateToleranceMinutes, tz)
    status      = late.status
    lateMinutes = late.lateMinutes
  }

  const updated = await prisma.attendanceRecord.update({
    where: { id },
    data:  { checkInTime: checkIn, checkOutTime: checkOut, notes: data.notes ?? record.notes, status, lateMinutes },
    include: INCLUDE_EMP,
  })
  return toDto(updated)
}

// ─── Delete record ────────────────────────────────────────────────────────────
export async function removeRecord(id: string, tenantId: string) {
  const record = await prisma.attendanceRecord.findFirst({ where: { id, tenantId, isDeleted: false } })
  if (!record) throw { code: 'NOT_FOUND', message: 'Registro no encontrado.' }
  await prisma.attendanceRecord.update({ where: { id }, data: { isDeleted: true } })
}
