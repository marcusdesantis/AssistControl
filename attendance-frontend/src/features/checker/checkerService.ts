import { api } from '@/services/api'
import type { AttendanceRecord } from '@/types/attendance'
import type { CheckerResponse } from '@/types/message'

interface ApiResponse<T> {
  success: boolean
  message?: string
  data?: T
  errorCode?: string
}

export interface CheckerReportDay {
  date:               string        // "YYYY-MM-DD"
  dayName:            string
  isWorkDay:          boolean
  checkIn?:           string        // "HH:mm:ss"
  checkOut?:          string
  workedMinutes?:     number
  scheduledMinutes?:  number
  balanceMinutes?:    number
  extraMinutes?:      number
  delayMinutes?:      number
  earlyLeaveMinutes?: number
  dayStatus:          string
}

export interface CheckerEmployeeReport {
  employeeName:                 string
  employeeCode:                 string
  department:                   string
  scheduleName:                 string
  from:                         string
  to:                           string
  days:                         CheckerReportDay[]
  totalWorkedMinutes:           number
  scheduledMinutesNoAbsences:   number
  extraMinutesNoAbsences:       number
  balanceMinutesNoAbsences:     number
  scheduledMinutesWithAbsences: number
  extraMinutesWithAbsences:     number
  balanceMinutesWithAbsences:   number
  totalWorkdays:                number
  workdaysAttended:             number
  totalAbsences:                number
  totalLates:                   number
  totalEarlyDepartures:         number
  incompleteEvents:             number
  attendancePercent:            number
}

export const checkerService = {
  getFeed: async (checkerKey: string): Promise<AttendanceRecord[]> => {
    const res = await api.get<ApiResponse<AttendanceRecord[]>>('/checker/feed', { params: { checkerKey } })
    return res.data.data ?? []
  },

  requestOtp: async (checkerKey: string, employeeCode: string, pin: string): Promise<string> => {
    const res = await api.post<ApiResponse<string>>('/checker/request-otp', {
      checkerKey, employeeCode: employeeCode.toUpperCase(), pin,
    })
    return res.data.data! // email enmascarado
  },

  checkIn: async (checkerKey: string, employeeCode: string, pin: string, otpCode?: string): Promise<CheckerResponse> => {
    const res = await api.post<ApiResponse<CheckerResponse>>('/checker/check-in', {
      checkerKey, employeeCode: employeeCode.toUpperCase(), pin, otpCode: otpCode ?? null,
    })
    return res.data.data!
  },

  checkOut: async (checkerKey: string, employeeCode: string, pin: string): Promise<CheckerResponse> => {
    const res = await api.post<ApiResponse<CheckerResponse>>('/checker/check-out', {
      checkerKey, employeeCode: employeeCode.toUpperCase(), pin,
    })
    return res.data.data!
  },

  getEmployeeReport: async (
    checkerKey: string,
    employeeId: string,
    from: string,
    to: string
  ): Promise<CheckerEmployeeReport> => {
    const res = await api.get<ApiResponse<CheckerEmployeeReport>>('/checker/employee-report', {
      params: { checkerKey, employeeId, from, to },
    })
    return res.data.data!
  },
}
