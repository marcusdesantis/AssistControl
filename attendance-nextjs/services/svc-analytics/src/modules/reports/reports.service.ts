import { prisma, getScheduleDay, getScheduledMinutes, calcOvertimeSegments, getOvertimeRules } from '@attendance/shared'
import type { OvertimeRules } from '@attendance/shared'
import { DateTime } from 'luxon'

const DAYS_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
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

function schedMins(day: any, schedule?: any): number {
  return getScheduledMinutes(day, schedule ?? { type: 'Fixed', days: [], lateToleranceMinutes: 0 })
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
  isWorkDay:     boolean
  isHoliday:     boolean
  nocturnalMinutes?:          number | null
  supplementaryMinutes?:      number | null
  supplementaryNightMinutes?: number | null
  extraordinaryMinutes?:      number | null
  totalOvertimeMinutes?:      number | null
}

function buildDayRows(
  emp: any, records: any[], from: string, to: string,
  tz: string, today: string, holidayDates: Set<string>,
  overtimeRules: OvertimeRules | null = null,
): DayRow[] {
  const recordsByDate = new Map<string, any[]>()
  for (const r of records) {
    if (!recordsByDate.has(r.date)) recordsByDate.set(r.date, [])
    recordsByDate.get(r.date)!.push(r)
  }

  const rows: DayRow[] = []
  const isVariable = emp.schedule?.type === 'Variable'

  let cur = DateTime.fromISO(from)
  const end = DateTime.fromISO(to)
  while (cur <= end) {
    const dateStr   = cur.toFormat('yyyy-MM-dd')
    const dayName   = DAYS_ES[cur.weekday % 7]
    const schedDay  = emp.schedule ? getScheduleDay(emp.schedule as any, cur, emp.scheduleStartDate ?? null) : null
    const isWork    = schedDay?.isWorkDay ?? false
    const isHoliday = holidayDates.has(dateStr)

    const dayRecs = (recordsByDate.get(dateStr) ?? []).sort(
      (a: any, b: any) => (a.checkInTime?.getTime() ?? 0) - (b.checkInTime?.getTime() ?? 0),
    )
    const first = dayRecs[0]
    const last  = dayRecs[dayRecs.length - 1]

    let delayMinutes: number | null = null
    let earlyLeaveMinutes: number | null = null

    if (!isVariable && first?.checkInTime && schedDay?.entryTime && emp.schedule) {
      const localIn = DateTime.fromJSDate(first.checkInTime, { zone: tz })
      const [eh, em] = schedDay.entryTime.split(':').map(Number)
      const threshold = localIn.set({ hour: eh, minute: em, second: 0 })
        .plus({ minutes: emp.schedule.lateToleranceMinutes ?? 0 })
      if (localIn > threshold)
        delayMinutes = Math.round(localIn.diff(threshold, 'minutes').minutes)
    }

    if (!isVariable && last?.checkOutTime && schedDay?.exitTime) {
      const localOut = DateTime.fromJSDate(last.checkOutTime, { zone: tz })
      const [xh, xm] = schedDay.exitTime.split(':').map(Number)
      const scheduledExit = localOut.set({ hour: xh, minute: xm, second: 0 })
      if (localOut < scheduledExit)
        earlyLeaveMinutes = Math.round(scheduledExit.diff(localOut, 'minutes').minutes)
    }

    // Overtime calculation
    let nocturnalMinutes:          number | null = null
    let supplementaryMinutes:      number | null = null
    let supplementaryNightMinutes: number | null = null
    let extraordinaryMinutes:      number | null = null
    let totalOvertimeMinutes:      number | null = null

    if (overtimeRules && first?.checkInTime && last?.checkOutTime) {
      const localIn  = DateTime.fromJSDate(first.checkInTime,  { zone: tz })
      const localOut = DateTime.fromJSDate(last.checkOutTime,  { zone: tz })
      const dayStart = DateTime.fromISO(dateStr, { zone: tz })
      const reqMins  = (schedDay as any)?.requiredMinutes
        ?? (emp.schedule?.requiredHoursPerDay ? emp.schedule.requiredHoursPerDay * 60 : null)

      const segments = calcOvertimeSegments({
        checkIn: localIn, checkOut: localOut,
        scheduledEntry:  schedDay?.entryTime ?? null,
        scheduledExit:   schedDay?.exitTime  ?? null,
        requiredMinutes: reqMins,
        isWorkDay: isWork, isHoliday,
        scheduleType: emp.schedule?.type ?? 'Fixed',
        date: dayStart,
      }, overtimeRules)

      for (const seg of segments) {
        if (seg.type === 'nocturnal')          nocturnalMinutes          = (nocturnalMinutes          ?? 0) + seg.minutes
        if (seg.type === 'supplementary')      supplementaryMinutes      = (supplementaryMinutes      ?? 0) + seg.minutes
        if (seg.type === 'supplementaryNight') supplementaryNightMinutes = (supplementaryNightMinutes ?? 0) + seg.minutes
        if (seg.type === 'extraordinary')      extraordinaryMinutes      = (extraordinaryMinutes      ?? 0) + seg.minutes
      }
      const tot = (supplementaryMinutes ?? 0) + (supplementaryNightMinutes ?? 0) + (extraordinaryMinutes ?? 0)
      if (tot > 0 || (nocturnalMinutes ?? 0) > 0) totalOvertimeMinutes = tot
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
        statusKey:   first.status,
        statusLabel: STATUS_LABEL[first.status] ?? first.status,
        delayMinutes, earlyLeaveMinutes,
        isWorkDay: isWork, isHoliday,
        nocturnalMinutes, supplementaryMinutes, supplementaryNightMinutes,
        extraordinaryMinutes, totalOvertimeMinutes,
      })
    } else if (isWork && dateStr <= today && !isHoliday) {
      rows.push({
        employeeId: emp.id, employeeCode: emp.employeeCode,
        fullName: `${emp.firstName} ${emp.lastName}`,
        department: emp.department?.name ?? '',
        date: dateStr, dayName,
        checkInTime: null, checkOutTime: null, hoursWorked: null,
        statusKey: 'Absent', statusLabel: 'Ausente',
        delayMinutes: null, earlyLeaveMinutes: null,
        isWorkDay: isWork, isHoliday,
      })
    }
    cur = cur.plus({ days: 1 })
  }
  return rows
}

// ─── Get report (list) ────────────────────────────────────────────────────────
export async function getReport(
  tenantId: string, reportType: string,
  from: string, to: string,
  page = 1, pageSize = 20,
  department?: string, search?: string,
) {
  const tenant = await prisma.tenant.findFirst({ where: { id: tenantId } })
  const tz     = tenant?.timeZone ?? 'America/Guayaquil'
  const today  = DateTime.now().setZone(tz).toFormat('yyyy-MM-dd')
  const overtimeRules = reportType === 'overtime' ? getOvertimeRules((tenant as any)?.country) : null

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

  const holidays = await prisma.holiday.findMany({
    where: { tenantId, isDeleted: false, date: { gte: from, lte: to } },
    select: { date: true },
  })
  const holidayDates = new Set(holidays.map(h => h.date))

  let allRows: DayRow[] = []
  for (const emp of employees) {
    allRows.push(...buildDayRows(
      emp, recordsByEmp.get(emp.id) ?? [], from, to, tz, today, holidayDates, overtimeRules,
    ))
  }

  if (reportType === 'absences')          allRows = allRows.filter(r => r.statusKey === 'Absent')
  else if (reportType === 'lates')        allRows = allRows.filter(r => r.statusKey === 'Late')
  else if (reportType === 'early-departures') allRows = allRows.filter(r => (r.earlyLeaveMinutes ?? 0) > 0)
  else if (reportType === 'overtime')     allRows = allRows.filter(r =>
    (r.totalOvertimeMinutes ?? 0) > 0 || (r.nocturnalMinutes ?? 0) > 0,
  )

  if (search) {
    const q = search.toLowerCase()
    allRows = allRows.filter(r =>
      r.fullName.toLowerCase().includes(q) ||
      r.employeeCode.toLowerCase().includes(q) ||
      r.department.toLowerCase().includes(q),
    )
  }

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
  const overtimeRules = reportType === 'overtime' ? getOvertimeRules((tenant as any)?.country) : null

  const emp = await prisma.employee.findFirst({
    where:   { tenantId, employeeCode, isDeleted: false },
    include: {
      department: { select: { name: true } },
      position:   { select: { name: true } },
      schedule:   true,
    },
  })
  if (!emp) throw { code: 'NOT_FOUND', message: 'Empleado no encontrado.' }

  const holidays = await prisma.holiday.findMany({
    where: { tenantId, isDeleted: false, date: { gte: from, lte: to } },
    select: { date: true },
  })
  const holidayDates = new Set(holidays.map(h => h.date))

  const records = await prisma.attendanceRecord.findMany({
    where:   { employeeId: emp.id, tenantId, date: { gte: from, lte: to }, isDeleted: false },
    orderBy: { checkInTime: 'asc' },
  })

  const recordsByDate = new Map<string, typeof records>()
  for (const r of records) {
    if (!recordsByDate.has(r.date)) recordsByDate.set(r.date, [])
    recordsByDate.get(r.date)!.push(r)
  }

  const isVariableSchedule = emp.schedule?.type === 'Variable'
  const days: any[] = []

  let totalWorked = 0, schedNoAbs = 0, schedWithAbs = 0
  let extraNoAbs = 0, extraWithAbs = 0
  let workdays = 0, attended = 0, absences = 0, lates = 0, earlyDeps = 0, incomplete = 0
  let totalNocturnal = 0, totalSupplementary = 0, totalSupplementaryNight = 0, totalExtraordinary = 0

  let cur = DateTime.fromISO(from)
  const end = DateTime.fromISO(to)
  while (cur <= end) {
    const dateStr   = cur.toFormat('yyyy-MM-dd')
    const dayName   = DAYS_ES[cur.weekday % 7]
    const schedDay  = emp.schedule ? getScheduleDay(emp.schedule as any, cur, emp.scheduleStartDate ?? null) : null
    const isWork    = schedDay?.isWorkDay ?? false
    const isHoliday = holidayDates.has(dateStr)
    const sMin      = schedMins(schedDay, emp.schedule)

    if (isWork) { workdays++; schedWithAbs += sMin }

    const dayRecs = (recordsByDate.get(dateStr) ?? []).sort(
      (a: any, b: any) => (a.checkInTime?.getTime() ?? 0) - (b.checkInTime?.getTime() ?? 0),
    )

    // Día de descanso: en reporte overtime con registros mostramos como extraordinaria
    if (!isWork) {
      if (reportType !== 'overtime' || dayRecs.length === 0) {
        days.push({ date: dateStr, dayName, isWorkDay: false, entries: [], dayStatus: 'Descanso' })
        cur = cur.plus({ days: 1 }); continue
      }
      // overtime + registros en día de descanso → cae al bloque de records abajo
    }

    if (dayRecs.length === 0) {
      if (dateStr <= today && !isHoliday) absences++
      days.push({
        date: dateStr, dayName, isWorkDay: true, entries: [],
        scheduledMinutes: isHoliday ? 0 : sMin,
        dayStatus: isHoliday ? 'Inhábil' : (dateStr > today ? 'Sin registro' : 'Falta'),
      })
      cur = cur.plus({ days: 1 }); continue
    }

    // Tiene registros
    if (isWork) attended++
    schedNoAbs += sMin

    const first = dayRecs[0]
    const last  = dayRecs[dayRecs.length - 1]

    const workedMins = dayRecs
      .filter(r => r.checkInTime && r.checkOutTime)
      .reduce((acc, r) => acc + Math.round((r.checkOutTime!.getTime() - r.checkInTime!.getTime()) / 60_000), 0)
    if (workedMins > 0) totalWorked += workedMins

    const balance = workedMins > 0 ? workedMins - sMin : null
    const extra   = balance !== null ? Math.max(0, balance) : null
    if (extra !== null) { extraNoAbs += extra; extraWithAbs += extra }

    let delayMinutes: number | null = null
    let earlyLeaveMinutes: number | null = null

    if (!isVariableSchedule && first.checkInTime && schedDay?.entryTime) {
      const localIn = DateTime.fromJSDate(first.checkInTime, { zone: tz })
      const [eh, em] = schedDay.entryTime.split(':').map(Number)
      const threshold = localIn.set({ hour: eh, minute: em, second: 0 })
        .plus({ minutes: emp.schedule?.lateToleranceMinutes ?? 0 })
      if (localIn > threshold) {
        delayMinutes = Math.round(localIn.diff(threshold, 'minutes').minutes)
        lates++
      }
    }
    if (!isVariableSchedule && last.checkOutTime && schedDay?.exitTime) {
      const localOut = DateTime.fromJSDate(last.checkOutTime, { zone: tz })
      const [xh, xm] = schedDay.exitTime.split(':').map(Number)
      const scheduledExit = localOut.set({ hour: xh, minute: xm, second: 0 })
      if (localOut < scheduledExit) {
        earlyLeaveMinutes = Math.round(scheduledExit.diff(localOut, 'minutes').minutes)
        earlyDeps++
      }
    }
    if (dayRecs.some(r => !r.checkOutTime) && dateStr < today) incomplete++

    // Overtime calculation
    let dayNocturnal:          number | null = null
    let daySupplementary:      number | null = null
    let daySupplementaryNight: number | null = null
    let dayExtraordinary:      number | null = null

    if (overtimeRules && first.checkInTime && last.checkOutTime) {
      const localIn  = DateTime.fromJSDate(first.checkInTime, { zone: tz })
      const localOut = DateTime.fromJSDate(last.checkOutTime, { zone: tz })
      const dayStart = DateTime.fromISO(dateStr, { zone: tz })
      const reqMins  = (schedDay as any)?.requiredMinutes
        ?? (emp.schedule?.requiredHoursPerDay ? (emp.schedule as any).requiredHoursPerDay * 60 : null)

      const segments = calcOvertimeSegments({
        checkIn: localIn, checkOut: localOut,
        scheduledEntry:  schedDay?.entryTime ?? null,
        scheduledExit:   schedDay?.exitTime  ?? null,
        requiredMinutes: reqMins,
        isWorkDay: isWork, isHoliday,
        scheduleType: emp.schedule?.type ?? 'Fixed',
        date: dayStart,
      }, overtimeRules)

      for (const seg of segments) {
        if (seg.type === 'nocturnal')          { dayNocturnal          = (dayNocturnal          ?? 0) + seg.minutes; totalNocturnal          += seg.minutes }
        if (seg.type === 'supplementary')      { daySupplementary      = (daySupplementary      ?? 0) + seg.minutes; totalSupplementary      += seg.minutes }
        if (seg.type === 'supplementaryNight') { daySupplementaryNight = (daySupplementaryNight ?? 0) + seg.minutes; totalSupplementaryNight += seg.minutes }
        if (seg.type === 'extraordinary')      { dayExtraordinary      = (dayExtraordinary      ?? 0) + seg.minutes; totalExtraordinary      += seg.minutes }
      }
    }

    let dayStatus: string
    if (!isWork) {
      dayStatus = isHoliday ? 'Extraordinaria (feriado)' : 'Extraordinaria (descanso)'
    } else {
      dayStatus = dayRecs[0].status === 'Late'    ? 'Retardo'   :
                  dayRecs[0].status === 'HalfDay' ? 'Medio Día' :
                  dayRecs[0].status === 'Absent'  ? 'Falta'     : 'Asistido'
    }

    days.push({
      date: dateStr, dayName, isWorkDay: isWork,
      entries: dayRecs.map(r => ({
        checkInTime:   r.checkInTime  ?? null,
        checkOutTime:  r.checkOutTime ?? null,
        workedMinutes: minsBetween(r.checkInTime ?? null, r.checkOutTime ?? null),
      })),
      totalWorkedMinutes:  workedMins > 0 ? workedMins : null,
      scheduledMinutes:    isWork ? sMin : null,
      balanceMinutes:      balance,
      extraMinutes:        extra,
      delayMinutes,
      earlyLeaveMinutes,
      nocturnalMinutes:          dayNocturnal,
      supplementaryMinutes:      daySupplementary,
      supplementaryNightMinutes: daySupplementaryNight,
      extraordinaryMinutes:      dayExtraordinary,
      dayStatus,
    })
    cur = cur.plus({ days: 1 })
  }

  const filteredDays =
    reportType === 'absences'         ? days.filter(d => d.dayStatus === 'Falta')
    : reportType === 'lates'          ? days.filter(d => (d.delayMinutes ?? 0) > 0)
    : reportType === 'early-departures' ? days.filter(d => (d.earlyLeaveMinutes ?? 0) > 0)
    : reportType === 'overtime'       ? days.filter(d =>
        (d.nocturnalMinutes ?? 0) > 0 || (d.supplementaryMinutes ?? 0) > 0 ||
        (d.supplementaryNightMinutes ?? 0) > 0 || (d.extraordinaryMinutes ?? 0) > 0,
      )
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
    // Overtime totals
    totalNocturnalMinutes:          totalNocturnal,
    totalSupplementaryMinutes:      totalSupplementary,
    totalSupplementaryNightMinutes: totalSupplementaryNight,
    totalExtraordinaryMinutes:      totalExtraordinary,
  }
}
