export type ScheduleType = 'Fixed' | 'Variable' | 'Rotativo'

export interface ScheduleDay {
  day: number
  dayLabel?: string
  isWorkDay: boolean
  entryTime?: string | null
  exitTime?: string | null
  hasLunch: boolean
  lunchStart?: string | null
  lunchEnd?: string | null
  requiredMinutes?: number | null
}

export interface Schedule {
  id: string
  name: string
  type: ScheduleType
  typeLabel: string
  lateToleranceMinutes: number
  requiredHoursPerDay?: number | null
  // Fixed/Variable: ScheduleDay[]
  // Rotativo: ScheduleDay[][]
  days: ScheduleDay[] | ScheduleDay[][]
  rotationWeeks?: number | null
  rotationStartDate?: string | null
  employeeCount: number
  tenantId: string
  createdAt: string
}

export interface ScheduleDayInput {
  day: number
  isWorkDay: boolean
  entryTime?: string | null
  exitTime?: string | null
  hasLunch: boolean
  lunchStart?: string | null
  lunchEnd?: string | null
  requiredMinutes?: number | null
}

export interface CreateScheduleRequest {
  name: string
  type: ScheduleType
  lateToleranceMinutes: number
  requiredHoursPerDay?: number | null
  days: ScheduleDayInput[] | ScheduleDayInput[][]
  rotationWeeks?: number | null
  rotationStartDate?: string | null
}

export type UpdateScheduleRequest = CreateScheduleRequest
