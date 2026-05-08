import { DateTime } from 'luxon'

export interface ScheduleDay {
  day:              number
  isWorkDay:        boolean
  entryTime?:       string | null
  exitTime?:        string | null
  hasLunch:         boolean
  lunchStart?:      string | null
  lunchEnd?:        string | null
  requiredMinutes?: number | null   // Variable: minutos requeridos por día
}

export interface ScheduleLike {
  type:                 string
  days:                 unknown
  lateToleranceMinutes: number
  requiredHoursPerDay?: number | null
  rotationWeeks?:       number | null
  rotationStartDate?:   Date | null
}

/**
 * Devuelve la configuración del día que aplica para una fecha dada,
 * considerando los tres tipos de horario: Fixed, Variable y Rotativo.
 */
export function getScheduleDay(
  schedule:          ScheduleLike,
  date:              DateTime,
  employeeStartDate?: Date | null,
): ScheduleDay | null {
  const weekday = date.weekday % 7   // Luxon: 1=Lun … 7=Dom → convertimos a 0=Dom … 6=Sáb

  if (schedule.type === 'Rotativo') {
    const weeks = schedule.days as ScheduleDay[][]
    if (!Array.isArray(weeks) || weeks.length === 0) return null

    const rotationWeeks = schedule.rotationWeeks ?? weeks.length

    // Referencia: lunes de la semana en que el empleado inició con este horario
    const startDate = employeeStartDate
      ? DateTime.fromJSDate(employeeStartDate).startOf('week')
      : (schedule.rotationStartDate
          ? DateTime.fromJSDate(schedule.rotationStartDate).startOf('week')
          : date.startOf('week'))

    const daysDiff  = Math.floor(date.diff(startDate, 'days').days)
    const weekIndex = daysDiff < 0
      ? 0
      : Math.floor(daysDiff / 7) % rotationWeeks

    const weekDays = weeks[weekIndex]
    if (!Array.isArray(weekDays)) return null
    return weekDays.find((d: ScheduleDay) => d.day === weekday) ?? null
  }

  // Fixed o Variable: array plano de 7 días
  const days = schedule.days as ScheduleDay[]
  if (!Array.isArray(days)) return null
  return days.find((d: ScheduleDay) => d.day === weekday) ?? null
}

/**
 * Calcula los minutos laborables de un día según su configuración.
 * Para Variable usa requiredHoursPerDay del horario.
 * Para Fixed/Rotativo calcula desde entryTime/exitTime.
 */
export function getScheduledMinutes(
  schedDay: ScheduleDay | null,
  schedule: ScheduleLike,
): number {
  if (!schedDay?.isWorkDay) return 0

  if (schedule.type === 'Variable') {
    if ((schedDay as any).requiredMinutes != null)
      return (schedDay as any).requiredMinutes as number
    return Math.round((schedule.requiredHoursPerDay ?? 0) * 60)
  }

  if (!schedDay.entryTime || !schedDay.exitTime) return 0

  const [eh, em] = schedDay.entryTime.split(':').map(Number)
  const [xh, xm] = schedDay.exitTime.split(':').map(Number)
  let total = (xh * 60 + xm) - (eh * 60 + em)

  if (schedDay.hasLunch && schedDay.lunchStart && schedDay.lunchEnd) {
    const [lsh, lsm] = schedDay.lunchStart.split(':').map(Number)
    const [leh, lem] = schedDay.lunchEnd.split(':').map(Number)
    total -= (leh * 60 + lem) - (lsh * 60 + lsm)
  }

  return Math.max(0, total)
}

/**
 * Calcula el estado de asistencia (Present/Late) en el momento del check-in.
 * Para Variable: siempre Present (no hay hora fija de entrada).
 * isPostLunch=true: compara contra lunchEnd en vez de entryTime (retorno de almuerzo).
 */
export function calcAttendanceStatus(
  checkInUtc:         Date,
  schedule:           ScheduleLike | null,
  tz:                 string,
  employeeStartDate?: Date | null,
  isPostLunch?:       boolean,
): { status: 'Present' | 'Late'; lateMinutes: number } {
  if (!schedule) return { status: 'Present', lateMinutes: 0 }

  // Variable: sin hora de entrada fija, nunca hay retardo
  if (schedule.type === 'Variable') return { status: 'Present', lateMinutes: 0 }

  const local    = DateTime.fromJSDate(checkInUtc, { zone: tz })
  const schedDay = getScheduleDay(schedule, local, employeeStartDate)

  if (!schedDay?.isWorkDay) return { status: 'Present', lateMinutes: 0 }

  // Retorno de almuerzo: comparar contra lunchEnd
  if (isPostLunch && schedDay.hasLunch && schedDay.lunchEnd) {
    const [lh, lm] = schedDay.lunchEnd.split(':').map(Number)
    const threshold = local
      .set({ hour: lh, minute: lm, second: 0, millisecond: 0 })
      .plus({ minutes: schedule.lateToleranceMinutes ?? 0 })

    if (local <= threshold) return { status: 'Present', lateMinutes: 0 }
    return {
      status:      'Late',
      lateMinutes: Math.round(local.diff(threshold, 'minutes').minutes),
    }
  }

  // Entrada normal: comparar contra entryTime
  if (!schedDay.entryTime) return { status: 'Present', lateMinutes: 0 }

  const [h, m]  = schedDay.entryTime.split(':').map(Number)
  const threshold = local
    .set({ hour: h, minute: m, second: 0, millisecond: 0 })
    .plus({ minutes: schedule.lateToleranceMinutes ?? 0 })

  if (local <= threshold) return { status: 'Present', lateMinutes: 0 }
  return {
    status:      'Late',
    lateMinutes: Math.round(local.diff(threshold, 'minutes').minutes),
  }
}
