export type ScheduleType = 'Fixed' | 'Variable' | 'Rotating'

export interface ScheduleDay {
  day: number          // 0=Sunday, 1=Monday, ... 6=Saturday
  dayLabel: string
  isWorkDay: boolean
  entryTime: string    // "HH:mm"
  exitTime: string     // "HH:mm"
  hasLunch: boolean
  lunchStart?: string
  lunchEnd?: string
}

export interface Schedule {
  id: string
  name: string
  type: ScheduleType
  typeLabel: string
  lateToleranceMinutes: number
  requiredHoursPerDay?: number
  days: ScheduleDay[]
  employeeCount: number
  tenantId: string
  createdAt: string
}

export interface ScheduleDayInput {
  day: number
  isWorkDay: boolean
  entryTime: string
  exitTime: string
  hasLunch: boolean
  lunchStart?: string
  lunchEnd?: string
}

export interface CreateScheduleRequest {
  name: string
  type: ScheduleType
  lateToleranceMinutes: number
  requiredHoursPerDay?: number
  days: ScheduleDayInput[]
}

export type UpdateScheduleRequest = CreateScheduleRequest
