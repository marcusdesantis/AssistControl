export interface AttendanceReportRow {
  employeeCode:      string
  fullName:          string
  department:        string
  date:              string
  dayName:           string
  checkInTime?:      string
  checkOutTime?:     string
  hoursWorked?:      number
  statusKey:         string
  statusLabel:       string
  delayMinutes?:     number
  earlyLeaveMinutes?: number
  isWorkDay?:        boolean
  isHoliday?:        boolean
  nocturnalMinutes?:          number
  supplementaryMinutes?:      number
  supplementaryNightMinutes?: number
  extraordinaryMinutes?:      number
  totalOvertimeMinutes?:      number
}

export type ReportType =
  | 'general'
  | 'absences'
  | 'lates'
  | 'early-departures'
  | 'overtime'

export interface ReportDefinition {
  id:    ReportType
  label: string
  icon:  string
}

export const REPORT_DEFINITIONS: ReportDefinition[] = [
  { id: 'general',          label: '01 Reporte general de asistencia', icon: '📋' },
  { id: 'absences',         label: '02 Faltas',                        icon: '❌' },
  { id: 'lates',            label: '03 Retardos',                      icon: '⏰' },
  { id: 'early-departures', label: '04 Salidas antes de tiempo',       icon: '🚪' },
  { id: 'overtime',         label: '05 Horas extras',                  icon: '⚡' },
]

export interface ReportFilters {
  reportType: ReportType
  from:        string
  to:          string
  department?: string
  search?:     string
  page?:       number
  pageSize?:   number
}

// ─── Detail report types ──────────────────────────────────────────────────────

export interface ReportEntry {
  checkInTime?:   string
  checkOutTime?:  string
  workedMinutes?: number
}

export interface ReportDay {
  date:               string
  dayName:            string
  isWorkDay:          boolean
  entries:            ReportEntry[]
  totalWorkedMinutes?: number
  scheduledMinutes?:  number
  balanceMinutes?:    number
  extraMinutes?:      number
  delayMinutes?:      number
  earlyLeaveMinutes?: number
  nocturnalMinutes?:          number | null
  supplementaryMinutes?:      number | null
  supplementaryNightMinutes?: number | null
  extraordinaryMinutes?:      number | null
  dayStatus:          string
}

export interface EmployeeDetailReport {
  employeeName:  string
  employeeCode:  string
  department:    string
  scheduleName:  string
  from:          string
  to:            string
  reportType:    string
  days:          ReportDay[]

  totalWorkedMinutes:           number
  scheduledMinutesNoAbsences:   number
  extraMinutesNoAbsences:       number
  balanceMinutesNoAbsences:     number
  scheduledMinutesWithAbsences: number
  extraMinutesWithAbsences:     number
  balanceMinutesWithAbsences:   number

  totalWorkdays:      number
  workdaysAttended:   number
  totalAbsences:      number
  totalLates:         number
  totalEarlyDepartures: number
  incompleteEvents:   number
  attendancePercent:  number

  // Overtime totals
  totalNocturnalMinutes?:          number
  totalSupplementaryMinutes?:      number
  totalSupplementaryNightMinutes?: number
  totalExtraordinaryMinutes?:      number
}
