import { DateTime } from 'luxon'

export interface OvertimeRules {
  nocturnalStart:         number   // hora inicio recargo nocturno, ej. 19
  nocturnalEnd:           number   // hora fin recargo nocturno, ej. 6
  nocturnalRate:          number   // 25
  supplementaryRate:      number   // 50
  supplementaryNightRate: number   // 100
  extraordinaryRate:      number   // 100
}

export interface OvertimeSegment {
  type:    'nocturnal' | 'supplementary' | 'supplementaryNight' | 'extraordinary'
  label:   string
  rate:    number
  minutes: number
}

// Reglas por país — extensible para Colombia, Perú, México, etc.
export const OVERTIME_RULES: Record<string, OvertimeRules> = {
  EC: {
    nocturnalStart:         19,
    nocturnalEnd:           6,
    nocturnalRate:          25,
    supplementaryRate:      50,
    supplementaryNightRate: 100,
    extraordinaryRate:      100,
  },
}

export function getOvertimeRules(country?: string | null): OvertimeRules {
  return OVERTIME_RULES[country ?? 'EC'] ?? OVERTIME_RULES['EC']
}

function intersectMins(s1: DateTime, e1: DateTime, s2: DateTime, e2: DateTime): number {
  const s = s1 > s2 ? s1 : s2
  const e = e1 < e2 ? e1 : e2
  if (s >= e) return 0
  return Math.round(e.diff(s, 'minutes').minutes)
}

// Minutos de [start, end) que caen en el rango nocturno [noctStart:00, noctEnd:00)
// El rango nocturno cruza medianoche: 19:00 → 06:00 del día siguiente
function nocturnalMinsInRange(
  start:     DateTime,
  end:       DateTime,
  noctStart: number,
  noctEnd:   number,
): number {
  if (start >= end) return 0
  let total = 0
  let d = start.startOf('day')
  const lastDay = end.startOf('day')
  while (d <= lastDay) {
    // Ventana vespertina: [noctStart:00, medianoche)
    const evS = d.set({ hour: noctStart, minute: 0, second: 0, millisecond: 0 })
    const evE = d.plus({ days: 1 }).startOf('day')
    total += intersectMins(start, end, evS, evE)
    // Ventana madrugada: [00:00, noctEnd:00)
    const moS = d.startOf('day')
    const moE = d.set({ hour: noctEnd,   minute: 0, second: 0, millisecond: 0 })
    total += intersectMins(start, end, moS, moE)
    d = d.plus({ days: 1 })
  }
  return total
}

export interface OvertimeInput {
  checkIn:         DateTime   // hora local
  checkOut:        DateTime   // hora local
  scheduledEntry:  string | null   // "HH:MM"
  scheduledExit:   string | null   // "HH:MM"
  requiredMinutes: number | null   // para horarios Variable
  isWorkDay:       boolean
  isHoliday:       boolean
  scheduleType:    string          // 'Fixed' | 'Variable' | 'Rotativo'
  date:            DateTime        // inicio del día en tz local
}

export function calcOvertimeSegments(
  input: OvertimeInput,
  rules: OvertimeRules,
): OvertimeSegment[] {
  const {
    checkIn, checkOut, scheduledEntry, scheduledExit, requiredMinutes,
    isWorkDay, isHoliday, scheduleType, date,
  } = input
  const {
    nocturnalStart, nocturnalEnd, nocturnalRate,
    supplementaryRate, supplementaryNightRate, extraordinaryRate,
  } = rules

  const segments: OvertimeSegment[] = []
  if (checkIn >= checkOut) return segments

  // ── Día de descanso o feriado → todo lo trabajado es Extraordinaria 100% ──
  if (isHoliday || !isWorkDay) {
    const mins = Math.round(checkOut.diff(checkIn, 'minutes').minutes)
    if (mins > 0) {
      segments.push({
        type:    'extraordinary',
        label:   isHoliday ? 'Extraordinaria (feriado)' : 'Extraordinaria (descanso)',
        rate:    extraordinaryRate,
        minutes: mins,
      })
    }
    return segments
  }

  // ── Día laborable ────────────────────────────────────────────────────────────

  let schedEntryDt: DateTime | null = null
  let schedExitDt:  DateTime | null = null

  if (scheduledEntry && scheduledExit) {
    const [eh, em] = scheduledEntry.split(':').map(Number)
    const [xh, xm] = scheduledExit.split(':').map(Number)
    schedEntryDt = date.set({ hour: eh, minute: em, second: 0, millisecond: 0 })
    schedExitDt  = date.set({ hour: xh, minute: xm, second: 0, millisecond: 0 })
    // Turno nocturno: si la salida es anterior a la entrada, es del día siguiente
    if (schedExitDt <= schedEntryDt) schedExitDt = schedExitDt.plus({ days: 1 })
  }

  // Recargo nocturno (25%) — horas ordinarias del turno entre 19:00 y 06:00
  // Solo aplica a horarios Fixed/Rotativo (Variable no tiene hora fija de turno)
  if (schedEntryDt && schedExitDt && scheduleType !== 'Variable') {
    const noctMins = nocturnalMinsInRange(schedEntryDt, schedExitDt, nocturnalStart, nocturnalEnd)
    if (noctMins > 0) {
      segments.push({ type: 'nocturnal', label: 'Recargo nocturno', rate: nocturnalRate, minutes: noctMins })
    }
  }

  // Horas extra (suplementarias)
  let extraStart: DateTime | null = null

  if (schedExitDt && checkOut > schedExitDt) {
    // Fixed/Rotativo: las horas extra empiezan en la salida programada
    extraStart = schedExitDt
  } else if (scheduleType === 'Variable' && requiredMinutes && requiredMinutes > 0) {
    // Variable: las horas extra empiezan cuando supera los minutos requeridos
    const workedMins = Math.round(checkOut.diff(checkIn, 'minutes').minutes)
    if (workedMins > requiredMinutes) {
      extraStart = checkIn.plus({ minutes: requiredMinutes })
    }
  }

  if (extraStart) {
    const midnight = date.plus({ days: 1 }).startOf('day')
    const extraEnd = checkOut

    // Suplementaria diurna (50%): horas extra antes de medianoche
    if (extraStart < midnight) {
      const suppEnd  = extraEnd < midnight ? extraEnd : midnight
      const suppMins = Math.round(suppEnd.diff(extraStart, 'minutes').minutes)
      if (suppMins > 0) {
        segments.push({ type: 'supplementary', label: 'Suplementaria', rate: supplementaryRate, minutes: suppMins })
      }
    }

    // Suplementaria nocturna (100%): horas extra después de medianoche
    if (extraEnd > midnight) {
      const nightS    = extraStart > midnight ? extraStart : midnight
      const nightMins = Math.round(extraEnd.diff(nightS, 'minutes').minutes)
      if (nightMins > 0) {
        segments.push({ type: 'supplementaryNight', label: 'Suplementaria nocturna', rate: supplementaryNightRate, minutes: nightMins })
      }
    }
  }

  return segments
}
