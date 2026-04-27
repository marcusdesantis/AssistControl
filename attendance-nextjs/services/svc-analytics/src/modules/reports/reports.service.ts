import { prisma } from '@attendance/shared'
import { DateTime } from 'luxon'

const DAYS_ES   = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
// Reports use "Retardo" / "Falta" (admin view) — distinct from mobile "Tarde" / "Ausente"
const STATUS_LABEL: Record<string, string> = {
  Present: 'Presente', Late: 'Retardo', Absent: 'Falta', HalfDay: 'Medio Día', Excused: 'Justificado',
}

function minsBetween(a: Date | null, b: Date | null) {
  if (!a || !b) return null
  return Math.round((b.getTime() - a.getTime()) / 60_000)
}

function hoursWorked(a: Date | null, b: Date | null) {
  if (!a || !b) return null
  return Math.round(((b.getTime() - a.getTime()) / 3_600_000) * 100) / 100
}

function schedMins(day: any) {
  if (!day?.isWorkDay || !day.entryTime || !day.exitTime) return 0
  const [eh, em] = day.entryTime.split(':').map(Number)
  const [xh, xm] = day.exitTime.split(':').map(Number)
  let total = (xh * 60 + xm) - (eh * 60 + em)
  if (day.hasLunch && day.lunchStart && day.lunchEnd) {
    const [lsh, lsm] = day.lunchStart.split(':').map(Number)
    const [leh, lem] = day.lunchEnd.split(':').map(Number)
    total -= ((leh * 60 + lem) - (lsh * 60 + lsm))
  }
  return Math.max(0, total)
}

interface DayRow {
  employeeId:    string
  employeeCode:  string
  fullName:      string
  department:    string
  date:          string
  dayName:       string
  checkInTime?:  Date | null
  checkOutTime?: Date | null
  hoursWorked?:  number | null
  statusKey:     string
  statusLabel:   string
  delayMinutes?: number | null
  earlyLeaveMinutes?: number | null
}

function buildDayRows(emp: any, records: any[], from: string, to: string, tz: string, today: string): DayRow[] {
  const recordsByDate = new Map<string, any[]>()
  for (const r of records) {
    if (!recordsByDate.has(r.date)) recordsByDate.set(r.date, [])
    recordsByDate.get(r.date)!.push(r)
  }

  const rows: DayRow[] = []
  const schedDays: any[] = (emp.schedule?.days as any[]) ?? []

  let cur = DateTime.fromISO(from)
  const end = DateTime.fromISO(to)
  while (cur <= end) {
    const dateStr  = cur.toFormat('yyyy-MM-dd')
    const luxonDow = cur.weekday % 7
    const dayName  = DAYS_ES[luxonDow]
    const schedDay = schedDays.find((d: any) => d.day === luxonDow)
    const isWork   = schedDay?.isWorkDay ?? false

    const dayRecs = (recordsByDate.get(dateStr) ?? []).sort(
      (a: any, b: any) => (a.checkInTime?.getTime() ?? 0) - (b.checkInTime?.getTime() ?? 0),
    )
    const first = dayRecs[0]
    const last  = dayRecs[dayRecs.length - 1]

    let delayMinutes: number | null = null
    let earlyLeaveMinutes: number | null = null

    if (first?.checkInTime && schedDay?.entryTime && emp.schedule) {
      const localIn = DateTime.fromJSDate(first.checkInTime, { zone: tz })
      const [eh, em] = schedDay.entryTime.split(':').map(Number)
      const threshold = localIn.set({ hour: eh, minute: em, second: 0 })
        .plus({ minutes: emp.schedule.lateToleranceMinutes ?? 0 })
      if (localIn > threshold)
        delayMinutes = Math.round(localIn.diff(threshold, 'minutes').minutes)
    }

    if (last?.checkOutTime && schedDay?.exitTime) {
      const localOut = DateTime.fromJSDate(last.checkOutTime, { zone: tz })
      const [xh, xm] = schedDay.exitTime.split(':').map(Number)
      const scheduledExit = localOut.set({ hour: xh, minute: xm, second: 0 })
      if (localOut < scheduledExit)
        earlyLeaveMinutes = Math.round(scheduledExit.diff(localOut, 'minutes').minutes)
    }

    if (dayRecs.length > 0) {
      rows.push({
        employeeId: emp.id, employeeCode: emp.employeeCode,
        fullName: `${emp.firstName} ${emp.lastName}`,
        department: emp.department?.name ?? '',
        date: dateStr, dayName,
        checkInTime:  first?.checkInTime  ?? null,
        checkOutTime: last?.checkOutTime  ?? null,
        hoursWorked:  hoursWorked(first?.checkInTime ?? null, last?.checkOutTime ?? null),
        statusKey:    first.status,
        statusLabel:  STATUS_LABEL[first.status] ?? first.status,
        delayMinutes, earlyLeaveMinutes,
      })
    } else if (isWork && dateStr <= today) {
      rows.push({
        employeeId: emp.id, employeeCode: emp.employeeCode,
        fullName: `${emp.firstName} ${emp.lastName}`,
        department: emp.department?.name ?? '',
        date: dateStr, dayName,
        checkInTime: null, checkOutTime: null, hoursWorked: null,
        statusKey: 'Absent', statusLabel: 'Ausente',
        delayMinutes: null, earlyLeaveMinutes: null,
      })
    }
    cur = cur.plus({ days: 1 })
  }
  return rows
}

// ─── Get report ───────────────────────────────────────────────────────────────
export async function getReport(
  tenantId: string, reportType: string,
  from: string, to: string,
  page = 1, pageSize = 20,
  department?: string, search?: string,
) {
  const tenant = await prisma.tenant.findFirst({ where: { id: tenantId } })
  const tz     = tenant?.timeZone ?? 'America/Guayaquil'
  const today  = DateTime.now().setZone(tz).toFormat('yyyy-MM-dd')

  const empWhere: any = { tenantId, isDeleted: false, status: 'Active' }
  if (department) empWhere.department = { name: department }

  const employees = await prisma.employee.findMany({
    where:   empWhere,
    include: { department: { select: { name: true } }, schedule: true },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
  })

  const records = await prisma.attendanceRecord.findMany({
    where:   { tenantId, date: { gte: from, lte: to }, isDeleted: false },
    orderBy: { checkInTime: 'asc' },
  })

  const recordsByEmp = new Map<string, typeof records>()
  for (const r of records) {
    if (!recordsByEmp.has(r.employeeId)) recordsByEmp.set(r.employeeId, [])
    recordsByEmp.get(r.employeeId)!.push(r)
  }

  let allRows: DayRow[] = []
  for (const emp of employees) {
    allRows.push(...buildDayRows(emp, recordsByEmp.get(emp.id) ?? [], from, to, tz, today))
  }

  if (reportType === 'absences')         allRows = allRows.filter(r => r.statusKey === 'Absent')
  else if (reportType === 'lates')       allRows = allRows.filter(r => r.statusKey === 'Late')
  else if (reportType === 'early-departures') allRows = allRows.filter(r => (r.earlyLeaveMinutes ?? 0) > 0)
  else if (reportType === 'halfday')     allRows = allRows.filter(r => r.statusKey === 'HalfDay')

  if (search) {
    const q = search.toLowerCase()
    allRows = allRows.filter(r =>
      r.fullName.toLowerCase().includes(q) ||
      r.employeeCode.toLowerCase().includes(q) ||
      r.department.toLowerCase().includes(q),
    )
  }

  // Sort: date DESC, fullName ASC — matches .NET OrderByDescending(r => r.Date).ThenBy(r => r.FullName)
  allRows.sort((a, b) => {
    if (b.date !== a.date) return b.date < a.date ? -1 : 1
    return a.fullName.localeCompare(b.fullName)
  })

  const total = allRows.length
  const items = allRows.slice((page - 1) * pageSize, page * pageSize)
  return { items, total, page, pageSize }
}

// ─── Employee detail ──────────────────────────────────────────────────────────
export async function getEmployeeDetail(
  tenantId: string, employeeCode: string,
  from: string, to: string,
  reportType = 'general',
) {
  const tenant = await prisma.tenant.findFirst({ where: { id: tenantId } })
  const tz     = tenant?.timeZone ?? 'America/Guayaquil'
  const today  = DateTime.now().setZone(tz).toFormat('yyyy-MM-dd')

  const emp = await prisma.employee.findFirst({
    where:   { tenantId, employeeCode, isDeleted: false },
    include: {
      department: { select: { name: true } },
      position:   { select: { name: true } },
      schedule:   true,
    },
  })
  if (!emp) throw { code: 'NOT_FOUND', message: 'Empleado no encontrado.' }

  const records = await prisma.attendanceRecord.findMany({
    where:   { employeeId: emp.id, tenantId, date: { gte: from, lte: to }, isDeleted: false },
    orderBy: { checkInTime: 'asc' },
  })

  const recordsByDate = new Map<string, typeof records>()
  for (const r of records) {
    if (!recordsByDate.has(r.date)) recordsByDate.set(r.date, [])
    recordsByDate.get(r.date)!.push(r)
  }

  const schedDays: any[] = (emp.schedule?.days as any[]) ?? []
  const days: any[] = []

  let totalWorked = 0, schedNoAbs = 0, schedWithAbs = 0
  let extraNoAbs = 0, extraWithAbs = 0
  let workdays = 0, attended = 0, absences = 0, lates = 0, earlyDeps = 0, incomplete = 0

  let cur = DateTime.fromISO(from)
  const end = DateTime.fromISO(to)
  while (cur <= end) {
    const dateStr  = cur.toFormat('yyyy-MM-dd')
    const luxonDow = cur.weekday % 7
    const dayName  = DAYS_ES[luxonDow]
    const schedDay = schedDays.find((d: any) => d.day === luxonDow)
    const isWork   = schedDay?.isWorkDay ?? false
    const sMin     = schedMins(schedDay)

    if (isWork) { workdays++; schedWithAbs += sMin }

    const dayRecs = (recordsByDate.get(dateStr) ?? []).sort(
      (a: any, b: any) => (a.checkInTime?.getTime() ?? 0) - (b.checkInTime?.getTime() ?? 0),
    )

    if (!isWork) {
      days.push({ date: dateStr, dayName, isWorkDay: false, entries: [], dayStatus: 'Descanso' })
      cur = cur.plus({ days: 1 }); continue
    }

    if (dayRecs.length === 0) {
      if (dateStr <= today) absences++
      days.push({
        date: dateStr, dayName, isWorkDay: true, entries: [],
        scheduledMinutes: sMin,
        dayStatus: dateStr > today ? 'Sin registro' : 'Falta',
      })
      cur = cur.plus({ days: 1 }); continue
    }

    attended++
    schedNoAbs += sMin

    const workedMins = dayRecs
      .filter(r => r.checkInTime && r.checkOutTime)
      .reduce((acc, r) => acc + Math.round((r.checkOutTime!.getTime() - r.checkInTime!.getTime()) / 60_000), 0)
    if (workedMins > 0) totalWorked += workedMins

    const balance = workedMins > 0 ? workedMins - sMin : null
    const extra   = balance !== null ? Math.max(0, balance) : null
    if (extra !== null) { extraNoAbs += extra; extraWithAbs += extra }

    const first = dayRecs[0]
    const last  = dayRecs[dayRecs.length - 1]
    let delayMinutes: number | null = null
    let earlyLeaveMinutes: number | null = null

    if (first.checkInTime && schedDay?.entryTime) {
      const localIn = DateTime.fromJSDate(first.checkInTime, { zone: tz })
      const [eh, em] = schedDay.entryTime.split(':').map(Number)
      const threshold = localIn.set({ hour: eh, minute: em, second: 0 })
        .plus({ minutes: emp.schedule?.lateToleranceMinutes ?? 0 })
      if (localIn > threshold) {
        delayMinutes = Math.round(localIn.diff(threshold, 'minutes').minutes)
        lates++
      }
    }
    if (last.checkOutTime && schedDay?.exitTime) {
      const localOut = DateTime.fromJSDate(last.checkOutTime, { zone: tz })
      const [xh, xm] = schedDay.exitTime.split(':').map(Number)
      const scheduledExit = localOut.set({ hour: xh, minute: xm, second: 0 })
      if (localOut < scheduledExit) {
        earlyLeaveMinutes = Math.round(scheduledExit.diff(localOut, 'minutes').minutes)
        earlyDeps++
      }
    }
    if (dayRecs.some(r => !r.checkOutTime) && dateStr < today) incomplete++

    days.push({
      date: dateStr, dayName, isWorkDay: true,
      entries: dayRecs.map(r => ({
        checkInTime:   r.checkInTime  ?? null,
        checkOutTime:  r.checkOutTime ?? null,
        workedMinutes: minsBetween(r.checkInTime ?? null, r.checkOutTime ?? null),
      })),
      totalWorkedMinutes:  workedMins > 0 ? workedMins : null,
      scheduledMinutes:    sMin,
      balanceMinutes:      balance,
      extraMinutes:        extra,
      delayMinutes,
      earlyLeaveMinutes,
      dayStatus: dayRecs[0].status === 'Late'    ? 'Retardo'   :
                 dayRecs[0].status === 'HalfDay' ? 'Medio Día' :
                 dayRecs[0].status === 'Absent'  ? 'Falta'     : 'Asistido',
    })
    cur = cur.plus({ days: 1 })
  }

  // Filter days by reportType — totals are always computed over ALL days
  const filteredDays = reportType === 'absences'         ? days.filter(d => d.dayStatus === 'Falta')
                     : reportType === 'lates'            ? days.filter(d => (d.delayMinutes ?? 0) > 0)
                     : reportType === 'early-departures' ? days.filter(d => (d.earlyLeaveMinutes ?? 0) > 0)
                     : reportType === 'halfday'          ? days.filter(d => d.dayStatus === 'Medio Día')
                     : days

  return {
    employeeName:  `${emp.firstName} ${emp.lastName}`,
    employeeCode:  emp.employeeCode,
    department:    emp.department?.name ?? '',
    scheduleName:  emp.schedule?.name   ?? 'Sin horario',
    from, to, reportType,
    days: filteredDays,
    totalWorkedMinutes:           totalWorked,
    scheduledMinutesNoAbsences:   schedNoAbs,
    extraMinutesNoAbsences:       extraNoAbs,
    balanceMinutesNoAbsences:     totalWorked - schedNoAbs,
    scheduledMinutesWithAbsences: schedWithAbs,
    extraMinutesWithAbsences:     extraWithAbs,
    balanceMinutesWithAbsences:   totalWorked - schedWithAbs,
    totalWorkdays:      workdays,
    workdaysAttended:   attended,
    totalAbsences:      absences,
    totalLates:         lates,
    totalEarlyDepartures: earlyDeps,
    incompleteEvents:   incomplete,
    attendancePercent:  workdays > 0 ? Math.round((attended / workdays) * 100 * 100) / 100 : 0,
  }
}
